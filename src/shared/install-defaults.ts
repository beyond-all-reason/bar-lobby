// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/**
 * The engine and game an install is built around, named by `engine/default.txt` and `games/default.txt` in
 * the assets directory. Whatever assembles the install's content writes them: the Steam bundling does, a
 * standalone install has neither. Each holds only the version, the engine by its directory name and the game
 * by its full version name.
 */
export type InstallDefaults = { readonly engine?: string; readonly game?: string };

export const INSTALL_DEFAULT_FILES = { engine: ["engine", "default.txt"], game: ["games", "default.txt"] } as const;

// Surrounding whitespace, such as the newline an editor adds, is not part of the version.
export function parseDefaultFile(text: string | undefined): string | undefined {
    const version = text?.trim();

    return version || undefined;
}
