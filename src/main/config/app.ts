// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "path";
import { env } from "process";
import { app } from "electron";
import { homedir } from "os";

// Should be the same as `productName` in electron-builder.config.ts
// and in workaround in installer.nsh.
export const APP_NAME = "BeyondAllReason";

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

    console.error("Unsupported platform");
    process.exit(1);
}

const defaultLocations = getDefaultLocations();
// Allow overriding the paths using env variables.
export const ASSETS_PATH = path.resolve(process.env.BAR_ASSETS_PATH || defaultLocations.assets);
export const STATE_PATH = path.resolve(process.env.BAR_STATE_PATH || defaultLocations.state);

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

export const ENGINE_PATH = path.join(ASSETS_PATH, "engine");
export const REPLAYS_PATH = path.join(WRITE_DATA_PATH, "demos");
export const MAPS_PATHS: readonly string[] = [path.join(WRITE_DATA_PATH, "maps"), path.join(ASSETS_PATH, "maps")];
export const GAME_PATHS: readonly string[] = [path.join(WRITE_DATA_PATH, "games"), path.join(ASSETS_PATH, "games")];
// Everything rapid lives under assets.
export const PACKAGE_PATH = path.join(ASSETS_PATH, "packages");
export const POOL_PATH = path.join(ASSETS_PATH, "pool");
export const RAPID_INDEX_PATH = path.join(ASSETS_PATH, "rapid");

// Lobby specific cache path for scenario images. Maybe remove from here?
export const SCENARIO_IMAGE_PATH = path.join(STATE_PATH, "scenario-images");
