// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive, readonly } from "vue";
import { MatchmakingListOkResponseData } from "tachyon-protocol/types";

export enum MatchmakingStatus {
    Idle = "Idle",
    JoinRequested = "JoinRequested",
    Searching = "Searching",
    MatchFound = "MatchFound",
    MatchAccepted = "MatchAccepted",
}

type MatchmakingState = {
    status: MatchmakingStatus;
    errorMessage: string | null;
    selectedQueue: string;
    playlists: MatchmakingListOkResponseData["playlists"];
    isLoadingQueues: boolean;
    queueError?: string;
    playersReady?: number;
    playersQueued?: number;
    readySecondsRemaining?: number;
};

const state: MatchmakingState = reactive({
    status: MatchmakingStatus.Idle,
    errorMessage: null,
    selectedQueue: "1v1",
    playlists: [],
    isLoadingQueues: false,
    queueError: undefined,
    playersReady: 0,
    playersQueued: 0,
    readySecondsRemaining: undefined,
});

export const matchmakingStore = readonly(state);

/**
 * Get the display name for a specific queue/playlist
 * @param id The ID for the requested queue/playlist
 * @returns The display name for the requested queue/playlist
 */
export function getPlaylistName(id: string): string {
    const playlist = state.playlists.find((playlist) => playlist.id === id);
    return playlist?.name || id;
}

/**
 * The engines, games and maps a queue needs, by the names content is looked up under.
 */
export function queueContent(
    playlist:
        | {
              readonly engines: readonly { readonly version: string }[];
              readonly games: readonly { readonly springName: string }[];
              readonly maps: readonly { readonly springName: string }[];
          }
        | undefined
) {
    return {
        engines: playlist?.engines.map((engine) => engine.version) ?? [],
        games: playlist?.games.map((game) => game.springName) ?? [],
        maps: playlist?.maps.map((map) => map.springName) ?? [],
    };
}

export const matchmakingActions = {
    set(changes: Partial<MatchmakingState>) {
        Object.assign(state, changes);
    },
    // selectedQueue is the user's pick, not server state, so it survives going offline.
    clearOnlineState() {
        Object.assign(state, {
            status: MatchmakingStatus.Idle,
            playlists: [],
            isLoadingQueues: false,
            errorMessage: null,
            queueError: undefined,
            playersQueued: 0,
            playersReady: 0,
            readySecondsRemaining: undefined,
        });
    },
};
