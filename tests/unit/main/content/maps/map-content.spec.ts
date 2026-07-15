// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

const { settings } = vi.hoisted(() => ({
    settings: { devMode: false },
}));

vi.mock("@main/config/app", () => ({
    getAssetsPath: () => "/tmp/bar-lobby-assets",
    getCaCertPath: () => undefined,
    getEnginePath: () => "/tmp/bar-lobby-engines",
    getMapsPaths: () => ["/tmp/bar-lobby-maps"],
}));

vi.mock("@main/services/settings.service", () => ({
    settingsService: {
        getSettings: () => settings,
    },
}));

import { MapContentAPI } from "@main/content/maps/map-content";
import type { DownloadInfo } from "@main/content/downloads";

type PendingDownload = {
    resolve: (download: DownloadInfo) => void;
    reject: (error: Error) => void;
};

class ControlledMapContentAPI extends MapContentAPI {
    public readonly started: string[] = [];
    private readonly pending = new Map<string, PendingDownload>();

    public override isVersionInstalled() {
        return false;
    }

    public complete(springName: string) {
        this.pending.get(springName)?.resolve({ type: "map", name: springName, currentBytes: 1, totalBytes: 1, progress: 1 });
    }

    public fail(springName: string, error: Error) {
        this.pending.get(springName)?.reject(error);
    }

    protected override downloadContent(_type: "game" | "map", springName: string): Promise<DownloadInfo> {
        this.started.push(springName);
        return new Promise<DownloadInfo>((resolve, reject) => {
            this.pending.set(springName, { resolve, reject });
        });
    }
}

async function flushQueue() {
    await Promise.resolve();
    await Promise.resolve();
}

describe("MapContentAPI download queue", () => {
    beforeEach(() => {
        settings.devMode = false;
    });

    it("holds a dev-mode map as downloading before starting pr-downloader", async () => {
        vi.useFakeTimers();
        settings.devMode = true;
        try {
            const maps = new ControlledMapContentAPI();
            const download = maps.downloadMap("map-a");

            expect(maps.getMapDownloadQueue()).toEqual([{ springName: "map-a", status: "downloading" }]);
            expect(maps.started).toEqual([]);

            await vi.advanceTimersByTimeAsync(2999);
            expect(maps.started).toEqual([]);

            await vi.advanceTimersByTimeAsync(1);
            expect(maps.started).toEqual(["map-a"]);

            maps.complete("map-a");
            await expect(download).resolves.toBeUndefined();
        } finally {
            vi.useRealTimers();
        }
    });

    it("reports the active map first and preserves waiting queue order", async () => {
        const maps = new ControlledMapContentAPI();
        const queueChanges: unknown[] = [];
        maps.onMapDownloadQueueChanged.add((queue) => queueChanges.push(queue));

        const batch = maps.downloadMaps(["map-a", "map-b", "map-c"]);

        expect(maps.getMapDownloadQueue()).toEqual([
            { springName: "map-a", status: "downloading" },
            { springName: "map-b", status: "queued" },
            { springName: "map-c", status: "queued" },
        ]);

        maps.complete("map-a");
        await flushQueue();

        expect(maps.getMapDownloadQueue()).toEqual([
            { springName: "map-b", status: "downloading" },
            { springName: "map-c", status: "queued" },
        ]);
        expect(queueChanges).toContainEqual([
            { springName: "map-b", status: "downloading" },
            { springName: "map-c", status: "queued" },
        ]);

        maps.complete("map-b");
        await flushQueue();
        maps.complete("map-c");
        await expect(batch).resolves.toEqual([undefined, undefined, undefined]);
    });

    it("appends a later batch behind the active batch", async () => {
        const maps = new ControlledMapContentAPI();

        const firstBatch = maps.downloadMaps(["map-a", "map-b"]);
        const laterBatch = maps.downloadMaps(["map-c"]);

        expect(maps.started).toEqual(["map-a"]);

        maps.complete("map-a");
        await flushQueue();
        expect(maps.started).toEqual(["map-a", "map-b"]);

        maps.complete("map-b");
        await flushQueue();
        expect(maps.started).toEqual(["map-a", "map-b", "map-c"]);

        maps.complete("map-c");
        await expect(firstBatch).resolves.toEqual([undefined, undefined]);
        await expect(laterBatch).resolves.toEqual([undefined]);
    });

    it("queues a batch behind an active single-map request", async () => {
        const maps = new ControlledMapContentAPI();

        const first = maps.downloadMap("map-a");
        const batch = maps.downloadMaps(["map-b", "map-c"]);

        expect(maps.started).toEqual(["map-a"]);

        maps.complete("map-a");
        await flushQueue();
        expect(maps.started).toEqual(["map-a", "map-b"]);

        maps.complete("map-b");
        await flushQueue();
        maps.complete("map-c");

        await expect(first).resolves.toBeUndefined();
        await expect(batch).resolves.toEqual([undefined, undefined]);
    });

    it("continues with the next queued map after a download fails", async () => {
        const maps = new ControlledMapContentAPI();
        const failure = new Error("map-a failed");
        const batch = maps.downloadMaps(["map-a", "map-b"]);

        expect(maps.started).toEqual(["map-a"]);

        maps.fail("map-a", failure);
        await expect(batch).rejects.toThrow(failure);
        await flushQueue();
        expect(maps.started).toEqual(["map-a", "map-b"]);

        maps.complete("map-b");
    });

    it("does not start the same map more than once while it is active or queued", async () => {
        const maps = new ControlledMapContentAPI();

        const first = maps.downloadMap("map-a");
        const duplicateAndLaterMap = maps.downloadMaps(["map-a", "map-b"]);

        expect(maps.started).toEqual(["map-a"]);

        maps.complete("map-a");
        await flushQueue();
        expect(maps.started).toEqual(["map-a", "map-b"]);

        maps.complete("map-b");
        await expect(first).resolves.toBeUndefined();
        await expect(duplicateAndLaterMap).resolves.toEqual([undefined, undefined]);
    });
});
