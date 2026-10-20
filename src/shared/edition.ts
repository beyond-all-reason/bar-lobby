// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/**
 * Which distribution of the client this is. The same code ships as every edition: a packager names its
 * edition with `barEdition` in the packaged package.json (electron-builder `extraMetadata`), and
 * anything else, including no key at all, is the standalone client.
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

// Engines and games arrive with the install on an edition that does not download them, so a missing one
// means the install is damaged and only the store that installed it can put it back.
export function canAcquireInEdition(features: EditionFeatures, contentType: "engine" | "game" | "map") {
    return features.downloadEngineAndGame || (contentType !== "engine" && contentType !== "game");
}

// What main refuses to do because of the edition. Sent as codes so the renderer words them itself.
export type EditionRefusal = "content_bundled_with_install" | "assets_path_fixed";

export class EditionRefusalError extends Error {
    readonly refusal: EditionRefusal;

    constructor(refusal: EditionRefusal, subject: string) {
        super(`${refusal}: ${subject}`);
        this.name = "EditionRefusalError";
        this.refusal = refusal;
    }
}

// An error thrown in main reaches the renderer as its message alone, prefixed by whatever carried it,
// so past the IPC boundary a refusal is recognised by the name and code it was written with.
const refusalInMessage = /EditionRefusalError: \w+:/;

export function isEditionRefusal(error: unknown) {
    return error instanceof EditionRefusalError || (error instanceof Error && refusalInMessage.test(error.message));
}
