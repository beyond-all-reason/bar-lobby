// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Replay } from "@main/content/replays/replay";
import { db } from "@renderer/store/db";
import { reactive } from "vue";

const state: {
    isInitialized: boolean;
    highlightedReplays: Set<string>;
    endedNormallyFilter: boolean | null;
} = reactive({
    isInitialized: false,
    highlightedReplays: new Set(),
    endedNormallyFilter: null,
});

export const replaysStore = state;

export function acknowledgeReplay(fileName: string) {
    state.highlightedReplays.delete(fileName);
    // Force reactivity update
    state.highlightedReplays = new Set(state.highlightedReplays);
}

export function setEndedNormallyFilter(value: boolean | null) {
    state.endedNormallyFilter = value;
}

export async function initReplaysStore() {
    window.replays.onReplayCached((replay: Replay) => {
        db.replays.put(replay).catch((error) => {
            console.error("Failed to store replay in database:", replay.fileName, error);
        });
    });
    window.replays.onReplayDeleted((filename: string) => {
        console.debug("Received replay deleted event", filename);
        db.replays.where("fileName").equals(filename).delete();
    });
    window.replays.onHighlightOpened((fileNames: string[]) => {
        state.highlightedReplays = new Set(fileNames);
    });
    await syncReplays();
    state.isInitialized = true;
}

async function syncReplays() {
    console.debug("Syncing replays");
    const allReplays = await db.replays.toArray();
    window.replays.sync(allReplays.map((replay) => replay.fileName));
}
