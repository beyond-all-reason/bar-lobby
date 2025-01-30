import { GameVersion } from "@main/content/game/game-version";
import { LuaOption } from "@main/content/game/lua-options";
import { db } from "@renderer/store/db";
import { reactive, watch } from "vue";

export const gameStore = reactive({
    isInitialized: false,
    isGameRunning: false,
} as {
    isInitialized: boolean;
    isGameRunning: boolean;
    selectedGameVersion?: GameVersion;
    optionsMap?: Record<string, LuaOption & { section: string }>;
});

async function refreshStore() {
    await db.gameVersions.clear();
    const installedVersions = await window.game.getInstalledVersions();
    await db.gameVersions.bulkPut(installedVersions);
    const latestGameVersion = await db.gameVersions.orderBy("gameVersion").last();
    gameStore.selectedGameVersion = latestGameVersion;
}

watch(
    () => gameStore.selectedGameVersion,
    (latestGameVersion) => {
        if (latestGameVersion) {
            gameStore.optionsMap = latestGameVersion.luaOptionSections.reduce(
                (acc, section) => {
                    for (const option of section.options) {
                        acc[option.key] = { ...option, section: section.name };
                    }
                    return acc;
                },
                {} as Record<string, LuaOption & { section: string }>
            );
        }
    }
);

export async function downloadGame(version: string) {
    await window.game.downloadGame(version);
    await refreshStore();
}

export async function initGameStore() {
    if (gameStore.isInitialized) return;
    await refreshStore();
    window.downloads.onDownloadGameComplete(async (downloadInfo) => {
        console.debug("Received game download completed event", downloadInfo);
        await refreshStore();
    });
    window.game.onGameLaunched(() => {
        console.debug("Game loaded");
        gameStore.isGameRunning = true;
    });
    window.game.onGameClosed(() => {
        console.debug("Game closed");
        gameStore.isGameRunning = false;
    });
    gameStore.isInitialized = true;
}
