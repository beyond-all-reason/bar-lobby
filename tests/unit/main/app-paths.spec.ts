// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Edition, editionFeatures } from "@main/config/edition";

// Absolute on every host, so path.resolve leaves it where it is.
const root = path.resolve("/bar-test");
const installDir = path.join(root, "Windows_Build");
const exePath = path.join(installDir, "BeyondAllReason.exe");
const appData = path.join(root, "AppData", "Roaming");
const xdgState = path.join(root, "xdg-state");
const xdgData = path.join(root, "xdg-data");

const touchedEnv = ["BAR_ASSETS_PATH", "BAR_STATE_PATH", "APPDATA", "XDG_STATE_HOME", "XDG_DATA_HOME"] as const;
const savedEnv: Partial<Record<(typeof touchedEnv)[number], string | undefined>> = {};
const savedPlatform = process.platform;

// app.ts settles its paths while loading, so each case loads its own copy against the edition, platform
// and packaging it is about.
async function loadPaths(options: { edition: Edition; platform: NodeJS.Platform; isPackaged?: boolean }) {
    Object.defineProperty(process, "platform", { value: options.platform });
    vi.resetModules();
    vi.doMock("electron", () => ({
        app: {
            isPackaged: options.isPackaged ?? true,
            getPath: (name: string) => (name === "exe" ? exePath : ""),
            setPath: vi.fn(),
        },
    }));
    vi.doMock("@main/config/edition", () => ({ EDITION: options.edition, EDITION_FEATURES: editionFeatures(options.edition) }));

    return import("@main/config/app");
}

describe("app paths", () => {
    beforeEach(() => {
        for (const key of touchedEnv) {
            savedEnv[key] = process.env[key];
            delete process.env[key];
        }
        process.env.APPDATA = appData;
        process.env.XDG_STATE_HOME = xdgState;
        process.env.XDG_DATA_HOME = xdgData;
        vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        for (const key of touchedEnv) {
            if (savedEnv[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = savedEnv[key];
            }
        }
        Object.defineProperty(process, "platform", { value: savedPlatform });
        vi.doUnmock("electron");
        vi.doUnmock("@main/config/edition");
        vi.restoreAllMocks();
    });

    describe("steam", () => {
        it("reads assets from beside the executable and keeps the standalone state dir on Windows", async () => {
            const paths = await loadPaths({ edition: "steam", platform: "win32" });

            expect(paths.getAssetsPath()).toBe(path.join(installDir, "assets"));
            expect(paths.STATE_PATH).toBe(path.join(appData, "BeyondAllReason"));
        });

        it("reads assets from beside the executable and keeps the standalone state dir on Linux", async () => {
            const paths = await loadPaths({ edition: "steam", platform: "linux" });

            expect(paths.getAssetsPath()).toBe(path.join(installDir, "assets"));
            expect(paths.STATE_PATH).toBe(path.join(xdgState, "BeyondAllReason"));
        });

        it("downloads into the state data dir and removes maps only from there", async () => {
            const paths = await loadPaths({ edition: "steam", platform: "linux" });

            expect(paths.getContentWriteRoot()).toBe(paths.WRITE_DATA_PATH);
            expect(paths.getRemovableMapsPaths()).toEqual([path.join(paths.WRITE_DATA_PATH, "maps")]);
            // Still read from both, or the bundled maps would never be found.
            expect(paths.getMapsPaths()).toEqual([path.join(paths.WRITE_DATA_PATH, "maps"), path.join(installDir, "assets", "maps")]);
        });

        it("still lets BAR_ASSETS_PATH and BAR_STATE_PATH override the defaults", async () => {
            process.env.BAR_ASSETS_PATH = path.join(root, "override-assets");
            process.env.BAR_STATE_PATH = path.join(root, "override-state");

            const paths = await loadPaths({ edition: "steam", platform: "win32" });

            expect(paths.getAssetsPath()).toBe(path.join(root, "override-assets"));
            expect(paths.STATE_PATH).toBe(path.join(root, "override-state"));
            expect(paths.getContentWriteRoot()).toBe(path.join(root, "override-state", "data"));
        });

        it("uses the development directories when unpackaged", async () => {
            const paths = await loadPaths({ edition: "steam", platform: "linux", isPackaged: false });

            expect(paths.getAssetsPath()).toBe(path.join(process.cwd(), "assets"));
            expect(paths.STATE_PATH).toBe(path.join(process.cwd(), "state"));
        });
    });

    describe("standalone", () => {
        it("keeps assets beside the executable on Windows", async () => {
            const paths = await loadPaths({ edition: "standalone", platform: "win32" });

            expect(paths.getAssetsPath()).toBe(path.join(installDir, "assets"));
            expect(paths.STATE_PATH).toBe(path.join(appData, "BeyondAllReason"));
        });

        it("keeps assets under XDG_DATA_HOME on Linux", async () => {
            const paths = await loadPaths({ edition: "standalone", platform: "linux" });

            expect(paths.getAssetsPath()).toBe(path.join(xdgData, "BeyondAllReason", "assets"));
            expect(paths.STATE_PATH).toBe(path.join(xdgState, "BeyondAllReason"));
        });

        it("downloads into the assets dir and may remove maps from every maps dir", async () => {
            const paths = await loadPaths({ edition: "standalone", platform: "win32" });

            expect(paths.getContentWriteRoot()).toBe(paths.getAssetsPath());
            expect(paths.getRemovableMapsPaths()).toEqual(paths.getMapsPaths());
        });
    });
});
