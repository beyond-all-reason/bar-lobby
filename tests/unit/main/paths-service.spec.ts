// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

const { edition, handlers, fsPromises, setAssetsPath, updateSettings, reinit } = vi.hoisted(() => ({
    // Swapped wholesale by each test.
    edition: { name: "standalone", features: {} as Record<string, boolean> },
    handlers: new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>(),
    fsPromises: {
        readdir: vi.fn(async () => []),
        mkdir: vi.fn(async () => undefined),
        copyFile: vi.fn(async () => undefined),
        symlink: vi.fn(async () => undefined),
        readlink: vi.fn(async () => ""),
        rm: vi.fn(async () => undefined),
    },
    setAssetsPath: vi.fn(),
    updateSettings: vi.fn(async () => undefined),
    reinit: vi.fn(async () => undefined),
}));

// edition.ts reads app at import time.
vi.mock("electron", () => ({ app: { isPackaged: false, getAppPath: () => process.cwd() }, BrowserWindow: { fromWebContents: () => null }, dialog: {} }));
vi.mock("fs", () => ({ default: { promises: fsPromises } }));
vi.mock("@main/typed-ipc", () => ({
    ipcMain: {
        handle: (channel: string, listener: (event: unknown, ...args: unknown[]) => Promise<unknown>) => handlers.set(channel, listener),
    },
}));
// app.ts calls app.setPath at module scope, so it can't be imported in a test.
vi.mock("@main/config/app", () => ({ setAssetsPath, getAssetsPath: () => "/install/assets", STATE_PATH: "/state" }));
vi.mock("@main/config/edition", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@main/config/edition")>();

    return {
        ...actual,
        get EDITION() {
            return edition.name;
        },
        EDITION_FEATURES: edition.features,
    };
});
vi.mock("@main/services/settings.service", () => ({ settingsService: { updateSettings } }));
vi.mock("@main/content/content-api", () => ({ contentAPI: { reinit } }));

const { editionFeatures } = await vi.importActual<typeof import("@main/config/edition")>("@main/config/edition");
const { pathsService } = await import("@main/services/paths.service");

pathsService.registerIpcHandlers({ send: vi.fn() } as never);

function invoke(channel: string, ...args: unknown[]) {
    const handler = handlers.get(channel);
    if (!handler) throw new Error(`No handler registered for ${channel}`);

    return handler({}, ...args);
}

function asEdition(name: "standalone" | "steam") {
    edition.name = name;
    Object.assign(edition.features, editionFeatures(name));
}

const touchedDisk = () => Object.values(fsPromises).some((fn) => fn.mock.calls.length > 0);

describe("pathsService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        asEdition("standalone");
    });

    describe("on an edition with a fixed assets directory", () => {
        beforeEach(() => asEdition("steam"));

        it.each(["paths:changePath", "paths:copyAndChangePath", "paths:moveAndChangePath"])("refuses %s before touching anything", async (channel) => {
            await expect(invoke(channel, "/elsewhere")).rejects.toThrow(/cannot be changed/);

            expect(touchedDisk()).toBe(false);
            expect(updateSettings).not.toHaveBeenCalled();
            expect(setAssetsPath).not.toHaveBeenCalled();
            expect(reinit).not.toHaveBeenCalled();
        });

        it("still reports where the assets are", async () => {
            expect(await invoke("paths:getCurrentAssetsPath")).toBe("/install/assets");
        });
    });

    it("changes the assets path on the standalone edition", async () => {
        await invoke("paths:changePath", "/elsewhere");

        expect(updateSettings).toHaveBeenCalledWith({ assetsPath: "/elsewhere" });
        expect(setAssetsPath).toHaveBeenCalledWith("/elsewhere");
        expect(reinit).toHaveBeenCalledOnce();
    });
});
