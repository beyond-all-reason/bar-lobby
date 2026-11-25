// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Settings the game rewrites for itself, during play or on every launch, so they hold the game's state rather
// than the player's choice. The client doesn't keep them, report them or sync them, and carries the file's
// current value through when it rewrites the file, so the game finds what it last wrote.
export const GAME_OWNED_KEY_PATTERNS: readonly RegExp[] = [
    // Follows camera zoom and recent damage during play. The player's battle volume is snd_volbattle_options.
    /^snd_volbattle$/,
    // The loading screen's music, picked per launch.
    /^music_loadscreen_track$/,
    // Recomputed from the resolution on every launch by the game's luaintro/springconfig.lua. Not
    // MouseDragScrollThreshold, which the player sets.
    /^MouseDrag(Selection|BoxCommand|CircleCommand|FrontCommand)Threshold$/,
];

export const isGameOwnedKey = (key: string) => GAME_OWNED_KEY_PATTERNS.some((pattern) => pattern.test(key));
