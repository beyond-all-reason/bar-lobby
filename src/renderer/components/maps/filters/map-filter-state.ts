// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { GameType, Terrain } from "@main/content/maps/map-metadata";

export type MapFilterState = {
    terrain: Partial<Record<Terrain, boolean>>;
    gameType: Partial<Record<GameType, boolean>>;
    minPlayers: number;
    maxPlayers: number;
    favoritesOnly: boolean;
    downloadedOnly: boolean;
};

// Callers replace the whole object on each change rather than editing it in place.
export function createMapFilterState(): MapFilterState {
    return {
        terrain: {},
        gameType: {},
        minPlayers: 2,
        maxPlayers: 40,
        favoritesOnly: false,
        downloadedOnly: false,
    };
}
