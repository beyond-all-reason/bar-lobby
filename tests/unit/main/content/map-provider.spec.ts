// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

// path.join decides the separator, so nothing here may assume which one it used.
const { dir, parser, checksums, gate, basename } = vi.hoisted(() => {
    const dir = new Set<string>();
    const parser = { unreadable: new Set<string>(), parsed: [] as string[] };
    const checksums = { idle: vi.fn().mockResolvedValue(undefined), calc: vi.fn() };
    // Lets a test hold a parse open so a second sync can be started while the first is mid-pass.
    const gate: { held: Promise<void> | null } = { held: null };

    return { dir, parser, checksums, gate, basename: (filePath: string) => filePath.split(/[\\/]/).pop() ?? filePath };
});

vi.mock("@main/config/app", () => ({ getMapsPaths: () => ["/maps"] }));
vi.mock("@main/utils/logger", () => ({
    logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock("chokidar", () => ({
    default: { watch: () => ({ on: () => ({ on: () => ({}) }), close: vi.fn() }) },
}));
vi.mock("@main/utils/checksums", () => ({ calcChecksum: checksums.calc, whenChecksumsIdle: checksums.idle }));
vi.mock("@main/content/engine/engine-provider", () => ({ engineProvider: { getDefaultEngine: () => undefined, onDownloadComplete: { add: vi.fn() } } }));
vi.mock("$/map-parser/ultrasimple-map-parser", () => ({
    UltraSimpleMapParser: class {
        async parseMap(filePath: string) {
            const fileName = basename(filePath);
            if (gate.held) {
                await gate.held;
            }
            if (parser.unreadable.has(fileName)) {
                throw new Error(`cannot read ${fileName}`);
            }
            parser.parsed.push(fileName);

            return { springName: fileName.replace(".sd7", ""), fileName, fileNameWithExt: fileName };
        }
    },
}));
vi.mock("fs", () => ({
    promises: {
        readdir: async (path: string) => {
            if (path !== "/maps") {
                throw new Error("ENOENT");
            }

            return [...dir];
        },
        rm: async (path: string) => void dir.delete(basename(path)),
        mkdir: vi.fn().mockResolvedValue(undefined),
    },
}));
vi.mock("@main/content/pr-downloader", () => ({
    PrDownloaderAPI: class {
        public currentDownloads: unknown[] = [];
        public availableVersions = new Map();
        public onDownloadComplete = { dispatch: vi.fn(), add: vi.fn(), addOnce: vi.fn() };
        public async init() {
            return this;
        }
    },
}));

import { MapProvider } from "@main/content/maps/map-provider";

function hold() {
    let release!: () => void;
    gate.held = new Promise<void>((resolve) => {
        release = resolve;
    });

    return () => {
        gate.held = null;
        release();
    };
}

describe("MapProvider map index", () => {
    let provider: MapProvider;

    beforeEach(() => {
        dir.clear();
        parser.unreadable.clear();
        parser.parsed.length = 0;
        checksums.idle.mockClear();
        gate.held = null;
        provider = new MapProvider();
    });

    it("registers what is on disk and reports it", async () => {
        dir.add("quicksilver.sd7");
        const added: string[] = [];
        provider.onMapAdded.add((springName) => added.push(springName));

        await provider.syncMaps();

        expect(provider.isVersionInstalled("quicksilver")).toBe(true);
        expect(added).toEqual(["quicksilver"]);
    });

    it("drops what has gone and reports it", async () => {
        dir.add("quicksilver.sd7");
        await provider.syncMaps();

        const deleted: string[] = [];
        provider.onMapDeleted.add((springName) => deleted.push(springName));
        dir.delete("quicksilver.sd7");
        await provider.syncMaps();

        expect(provider.isVersionInstalled("quicksilver")).toBe(false);
        expect(deleted).toEqual(["quicksilver"]);
    });

    it("identifies each file only once across repeated syncs", async () => {
        dir.add("quicksilver.sd7");

        await provider.syncMaps();
        await provider.syncMaps();

        expect(parser.parsed).toEqual(["quicksilver.sd7"]);
    });

    // The bug this exists for: handing a caller the sync already in progress. That pass may have listed
    // the directory before the caller's change, so it can resolve without reflecting it.
    it("waits for a pass that starts after the caller asked, not one already running", async () => {
        dir.add("first.sd7");
        const release = hold();
        const firstSync = provider.syncMaps();

        dir.add("second.sd7");
        const secondSync = provider.syncMaps();
        release();

        await secondSync;

        expect(provider.isVersionInstalled("second")).toBe(true);
        await firstSync;
    });

    it("never runs two passes at once", async () => {
        dir.add("a.sd7");
        dir.add("b.sd7");
        let inFlight = 0;
        let peak = 0;
        const observed = vi.spyOn(provider as unknown as { getMapNameFromFile: (p: string) => Promise<string> }, "getMapNameFromFile");
        observed.mockImplementation(async (filePath: string) => {
            inFlight++;
            peak = Math.max(peak, inFlight);
            await Promise.resolve();
            inFlight--;

            return basename(filePath).replace(".sd7", "");
        });

        await Promise.all([provider.syncMaps(), provider.syncMaps(), provider.syncMaps()]);

        expect(peak).toBe(1);
    });

    // A sync triggered by one finished download can reach another that is still being written.
    it("leaves a file it cannot identify alone rather than deleting it", async () => {
        dir.add("half-written.sd7");
        parser.unreadable.add("half-written.sd7");

        await provider.syncMaps();

        expect(dir.has("half-written.sd7")).toBe(true);
        expect(provider.isVersionInstalled("half-written")).toBe(false);
    });

    it("picks up a file once it becomes readable", async () => {
        dir.add("half-written.sd7");
        parser.unreadable.add("half-written.sd7");
        await provider.syncMaps();

        parser.unreadable.clear();
        await provider.syncMaps();

        expect(provider.isVersionInstalled("half-written")).toBe(true);
    });

    // The engine holds an archive open while checksumming it, so unlinking it first fails on Windows.
    it("waits for outstanding checksums before removing a map", async () => {
        dir.add("quicksilver.sd7");
        await provider.syncMaps();

        await provider.uninstallVersion("quicksilver");

        expect(checksums.idle).toHaveBeenCalled();
        expect(dir.has("quicksilver.sd7")).toBe(false);
        expect(provider.isVersionInstalled("quicksilver")).toBe(false);
    });

    it("refuses to remove a map it has no file for", async () => {
        await expect(provider.uninstallVersion("never installed")).rejects.toThrow("No installed map file");
    });
});
