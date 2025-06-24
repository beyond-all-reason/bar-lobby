// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Replay } from "@main/content/replays/replay";
import { db } from "@renderer/store/db";
import { reactive } from "vue";

export const replaysStore: {
    isInitialized: boolean;
} = reactive({
    isInitialized: false,
});

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
    await syncReplays();
    replaysStore.isInitialized = true;
}

async function syncReplays() {
    console.debug("Syncing replays");
    const allReplays = await db.replays.toArray();
    window.replays.sync(allReplays.map((replay) => replay.fileName));
}
