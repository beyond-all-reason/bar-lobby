import { GameVersion } from "@main/content/game/game-version";
import { db } from "@renderer/store/db";
import { reactive } from "vue";

export const gameStore = reactive({
    isInitialized: false,
    isGameRunning: false,
} as {
    isInitialized: boolean;
    isGameRunning: boolean;
    latestGameVersion?: GameVersion;
});

async function refreshStore() {
    db.gameVersions.clear();
    const installedVersions = await window.game.getInstalledVersions();
    db.gameVersions.bulkAdd(installedVersions);
    const latestGameVersion = await db.gameVersions.orderBy("gameVersion").last();
    gameStore.latestGameVersion = latestGameVersion;
}

export async function initGameStore() {
    window.downloads.onDownloadGameComplete(async (downloadInfo) => {
        console.debug("Received game download completed event", downloadInfo);
        refreshStore();
    });
    window.game.onGameLaunched(() => {
        console.debug("Game loaded");
        gameStore.isGameRunning = true;
    });
    window.game.onGameClosed(() => {
        console.debug("Game closed");
        gameStore.isGameRunning = false;
    });

    refreshStore();

    gameStore.isInitialized = true;
}
