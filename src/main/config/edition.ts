// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "path";
import fs from "fs";
import { app } from "electron";

/**
 * Which distribution of the client this is. The same code ships as every edition: a packager names its
 * edition with `barEdition` in the packaged package.json (electron-builder `extraMetadata`), and
 * anything else, including no key at all, is the standalone client.
 *
 * Resolved before the single-instance lock and the paths, so nothing here may open the log file.
 */
export type Edition = "standalone" | "steam";

// Only a name we know switches anything off. A typo in a packaging config must not quietly turn a
// standalone build into one that can never update or download a game.
function asEdition(value: unknown): Edition | undefined {
    return value === "standalone" || value === "steam" ? value : undefined;
}

export function parseEditionMetadata(packageJson: string | undefined): Edition {
    if (packageJson === undefined) {
        return "standalone";
    }

    try {
        return asEdition((JSON.parse(packageJson) as { barEdition?: unknown })?.barEdition) ?? "standalone";
    } catch {
        return "standalone";
    }
}

/**
 * The environment override exists to try an edition from `npm start`. A packaged build answers only to
 * what it was packaged as, so a stray variable on a player's machine cannot change what it is.
 */
export function resolveEdition(options: { isPackaged: boolean; packageJson: string | undefined; envEdition: string | undefined }): Edition {
    const fromEnv = options.isPackaged ? undefined : asEdition(options.envEdition);

    return fromEnv ?? parseEditionMetadata(options.packageJson);
}

function readPackageJson() {
    try {
        return fs.readFileSync(path.join(app.getAppPath(), "package.json"), "utf8");
    } catch {
        return undefined;
    }
}

export function editionFeatures(edition: Edition) {
    return {
        // electron-updater; Steam updates the client itself.
        selfUpdate: edition === "standalone",
        // Engines, games and the pool seed. Maps can always be downloaded.
        downloadEngineAndGame: edition === "standalone",
        changeAssetsPath: edition === "standalone",
        // Steam owns the assets root and verifies it, so nothing may be written or removed under it.
        assetsReadOnly: edition === "steam",
        // The assets root sits beside the executable on every platform, not only on Windows.
        assetsBesideExecutable: edition === "steam",
    } as const;
}

export type EditionFeatures = ReturnType<typeof editionFeatures>;

export const EDITION: Edition = resolveEdition({ isPackaged: app.isPackaged, packageJson: readPackageJson(), envEdition: process.env.BAR_EDITION });
export const EDITION_FEATURES: EditionFeatures = editionFeatures(EDITION);
