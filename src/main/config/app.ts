// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "path";
import fs from "fs";
import { env } from "process";
import { app } from "electron";
import { homedir } from "os";
import { getBundledAssetsPath } from "@main/config/native-engine-runner";
import { getMacOSPortableStateMarkerPath, MACOS_PORTABLE_STATE_MARKER_FILE_NAME } from "@main/config/macos-portable";

export { MACOS_PORTABLE_STATE_MARKER_FILE_NAME };

// macOS is packaged with `-c.productName=BAR` so the accepted artifact path is
// BAR.app. Windows and Linux keep the existing product/state identity.
export const APP_NAME = process.platform === "darwin" ? "BAR" : "BeyondAllReason";

/**
 * The function returns default base directories for the application data.
 *
 * There are multiple different installation methods of lobby:
 * - Windows installer
 * - Linux AppImage
 * - Linux Flatpak
 * - Windows/Linux development setup
 * - In the future Windows/Linux steam
 * - Maybe in the future Windows/Linux portable distribution
 *
 * For now we try to categorize the data into 3 categories:
 * - Application binary: AppImage file, installed location on Windows, etc.
 *   We don't really control this, but can use it as base location for some
 *   platforms.
 * - Game assets: It's the engine, maps, game files that are rather static
 *   aren't per-user.
 * - State files: It's combination of configuration, replays, logs, caches,
 *   IndexedDB and other per user configuration.
 *
 * It's hard to split the state files into more categories that have well
 * defined standard locations under Linux (cache, config) because Electron
 * and Recoil engine don't support it: that data is mixed together.
 *
 * In short, simplifying the logic, we put data into:
 * - Under development (npm run start):
 *   - Assets: ./assets
 *   - State: ./state
 * - Windows:
 *   - Assets: AppData\Local\Programs\BeyondAllReason\assets
 *   - State: AppData\Roaming\BeyondAllReason
 * - Linux:
 *   - Assets: ~/.local/share/BeyondAllReason
 *   - State: ~/.local/state/BeyondAllReason
 * - macOS:
 *   - Assets: ~/Library/Application Support/BAR/assets
 *   - State: ~/Library/Application Support/BAR
 *   - Thread/local portable builds can opt into BAR.app-adjacent state by
 *     placing `bar-portable-state` in Contents/Resources.
 */
function getDefaultLocations(): { state: string; assets: string } {
    // We separate the developlment installation from production installation
    // in the system.
    if (!app.isPackaged) {
        return {
            assets: path.join(process.cwd(), "assets"),
            state: path.join(process.cwd(), "state"),
        };
    }
    if (process.platform === "win32") {
        // With the default electron builder, under user install, this
        // directory is `%LOCALAPPDATA%\Programs\${productName}`.
        // We don't build the path ourselves but depend on the location of
        // main executable.
        const appplicationBinaryDir = path.dirname(app.getPath("exe"));
        const appData = env.APPDATA || path.join(homedir(), "AppData", "Roaming");
        return {
            assets: path.join(appplicationBinaryDir, "assets"),
            state: path.join(appData, APP_NAME),
        };
    }
    if (process.platform === "linux") {
        const xdgStateHome = process.env.XDG_STATE_HOME || path.join(homedir(), ".local/state");
        const xdgDataHome = process.env.XDG_DATA_HOME || path.join(homedir(), ".local/share");
        return {
            // The `assets` prefix isn't really needed under Linux, but we add
            // it for consistency.
            assets: path.join(xdgDataHome, APP_NAME, "assets"),
            state: path.join(xdgStateHome, APP_NAME),
        };
    }
    if (process.platform === "darwin") {
        const portableLocations = getMacOSPortableLocations();
        if (portableLocations) {
            return portableLocations;
        }

        const applicationSupport = path.join(homedir(), "Library", "Application Support");
        return {
            assets: path.join(applicationSupport, APP_NAME, "assets"),
            state: path.join(applicationSupport, APP_NAME),
        };
    }

    console.error("Unsupported platform");
    process.exit(1);
}

function getMacOSPortableLocations(): { state: string; assets: string } | undefined {
    if (!app.isPackaged) {
        return undefined;
    }

    const markerPath = getMacOSPortableStateMarkerPath(process.resourcesPath);
    if (!fs.existsSync(markerPath)) {
        return undefined;
    }

    const appParentPath = path.resolve(process.resourcesPath, "..", "..", "..");
    const state = path.join(appParentPath, `${APP_NAME}-data`);
    return {
        assets: path.join(state, "assets"),
        state,
    };
}

const defaultLocations = getDefaultLocations();
// Allow overriding the paths using env variables.
let ASSETS_PATH: string = path.resolve(process.env.BAR_ASSETS_PATH || defaultLocations.assets);
export const STATE_PATH = path.resolve(process.env.BAR_STATE_PATH || defaultLocations.state);
export const BUNDLED_ASSETS_PATH = app.isPackaged && process.platform === "darwin" ? getBundledAssetsPath(process.resourcesPath) : undefined;

export function setAssetsPath(p: string) {
    ASSETS_PATH = path.resolve(p);
}

export function getAssetsPath() {
    return ASSETS_PATH;
}

// We set the `userData` property for Electron to also create files in correct
// locations, not only our own code.
app.setPath("userData", STATE_PATH);

console.log(`ASSETS_PATH: ${ASSETS_PATH}`);
console.log(`STATE_PATH: ${STATE_PATH}`);

export const CONFIG_PATH = path.join(STATE_PATH, "config");
export const LOGS_PATH = path.join(STATE_PATH, "logs");

// We will point engine at ASSETS_PATH as a base data directory to only read
// data from, and at WRITE_DATA_PATH as data directory it can write to.
export const WRITE_DATA_PATH = path.join(STATE_PATH, "data");

export const getEnginePath = () => path.join(ASSETS_PATH, "engine");
export const getPackagePath = () => path.join(ASSETS_PATH, "packages");
export const getPoolPath = () => path.join(ASSETS_PATH, "pool");
export const getRapidIndexPath = () => path.join(ASSETS_PATH, "rapid");
export const getMapsPaths = (): readonly string[] => [path.join(WRITE_DATA_PATH, "maps"), path.join(ASSETS_PATH, "maps")];
export const getGamePaths = (): readonly string[] => [path.join(WRITE_DATA_PATH, "games"), path.join(ASSETS_PATH, "games")];
export const REPLAYS_PATH = path.join(WRITE_DATA_PATH, "demos");

// Lobby specific cache path for scenario images. Maybe remove from here?
export const SCENARIO_IMAGE_PATH = path.join(STATE_PATH, "scenario-images");

/**
 * Get the path to the bundled CA certificate file for pr-downloader.
 * This is a workaround for a bug where pr-downloader's OpenSSL/curl doesn't
 * properly resolve certificates from the Windows certificate store on fresh
 * installations. On Linux, system certificates work fine and should be
 * preferred (they also support system-level MITM proxies).
 * See: https://github.com/beyond-all-reason/pr-downloader/issues/48
 */
export function getCaCertPath(): string | undefined {
    if (process.platform !== "win32") {
        return undefined;
    }
    if (!app.isPackaged) {
        const devPath = path.join(process.cwd(), "buildResources", "cacert.pem");
        return fs.existsSync(devPath) ? devPath : undefined;
    }
    const prodPath = path.join(process.resourcesPath, "cacert.pem");
    return fs.existsSync(prodPath) ? prodPath : undefined;
}
