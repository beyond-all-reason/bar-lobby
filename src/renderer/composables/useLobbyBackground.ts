// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, ref, watch } from "vue";
import { randomFromArray } from "$/jaz-ts-utils/object";
import { backgroundImages } from "@renderer/assets/assetFiles";
import { lobbyStore } from "@renderer/store/lobby.store";

/**
 * Visual themes a lobby can have. Lobbies with special settings get their own entry here.
 */
export type LobbyTheme = "default";

// TODO: take the active lobby and derive the theme from its special settings once they exist on the Lobby type.
function getLobbyTheme(): LobbyTheme {
    return "default";
}

/**
 * Background image url for the active lobby. Special lobbies map to a fixed image; otherwise a random
 * background is picked each time a lobby is entered and kept for as long as the client stays in it.
 */
export function useLobbyBackground() {
    const randomBackground = ref<string>();

    watch(
        () => lobbyStore.activeLobby?.id,
        (lobbyId) => {
            randomBackground.value = lobbyId ? randomFromArray(Object.values(backgroundImages)) : undefined;
        },
        { immediate: true }
    );

    return computed(() => {
        const lobby = lobbyStore.activeLobby;
        if (!lobby) return undefined;
        switch (getLobbyTheme()) {
            // Special themes return their own image here, e.g. `case "someTheme": return someThemeImage;`
            case "default":
            default:
                return randomBackground.value;
        }
    });
}
