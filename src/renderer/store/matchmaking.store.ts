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

type RequiredDownloads = {
    engines: string[];
    games: string[];
    maps: string[];
};

type MatchmakingState = {
    status: MatchmakingStatus;
    errorMessage: string | null;
    selectedQueue: string;
    playlists: MatchmakingListOkResponseData["playlists"];
    isLoadingQueues: boolean;
    queueError?: string;
    playersReady?: number;
    playersQueued?: number;
    // Each playlist is keyed by its id, and any array elements in the value object are required downloads for the corresponding type
    downloadsRequired: { [k: string]: RequiredDownloads };
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
    downloadsRequired: {},
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

export const matchmakingUpdates = {
    set(changes: Partial<Omit<MatchmakingState, "downloadsRequired">>) {
        Object.assign(state, changes);
    },
    setDownloadsRequired(queue: string, required: RequiredDownloads) {
        state.downloadsRequired[queue] = required;
    },
    // selectedQueue is the user's pick, not server state, and downloadsRequired is derived from
    // installed content rather than the session - the next list response recomputes it.
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
