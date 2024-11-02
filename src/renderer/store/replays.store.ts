import { Replay } from "@main/content/replays/replay";
import { db } from "@renderer/store/db";
import { reactive } from "vue";

export const replaysStore = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
});

export async function initReplaysStore() {
    window.replays.onReplayCached((replay: Replay) => {
        console.debug("Received replay cached event", replay);
        db.replays.add(replay);
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
