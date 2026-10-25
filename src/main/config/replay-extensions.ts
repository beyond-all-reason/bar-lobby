// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export const PRIMARY_REPLAY_EXTENSION = "barreplay";
export const LEGACY_REPLAY_EXTENSION = "sdfz";
export const REPLAY_EXTENSIONS: readonly string[] = [PRIMARY_REPLAY_EXTENSION, LEGACY_REPLAY_EXTENSION];

export function isReplayFile(filePathOrName: string): boolean {
    return REPLAY_EXTENSIONS.some((ext) => filePathOrName.endsWith(`.${ext}`));
}
