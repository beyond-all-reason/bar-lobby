// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { GameVersion } from "@main/content/game/game-version";
import { LuaOption } from "@main/content/game/lua-options";
import { Replay } from "@main/content/replays/replay";
import { BattleWithMetadata } from "@main/game/battle/battle-types";
import { db } from "@renderer/store/db";
import { reactive, watch } from "vue";

export enum GameStatus {
    LOADING,
    RUNNING,
    CLOSED,
}

export const gameStore: {
    isInitialized: boolean;
    status: GameStatus;
    selectedGameVersion?: GameVersion;
    optionsMap?: Record<string, LuaOption & { section: string }>;
} = reactive({
    isInitialized: false,
    status: GameStatus.CLOSED,
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

export async function startBattle(battle: BattleWithMetadata) {
    try {
        gameStore.status = GameStatus.LOADING;
        await window.game.launchBattle(battle);
        gameStore.status = GameStatus.RUNNING;
    } catch (error) {
        console.error("Failed to start battle:", error);
        gameStore.status = GameStatus.CLOSED;
        throw error; // Re-throw the error to display it in the UI
    }
}

export async function watchReplay(replay: Replay) {
    try {
        gameStore.status = GameStatus.LOADING;
        await window.game.launchReplay(replay);
        gameStore.status = GameStatus.RUNNING;
    } catch (error) {
        console.error("Failed to watch replay:", error);
        gameStore.status = GameStatus.CLOSED;
        throw error; // Re-throw the error to display it in the UI
    }
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
        gameStore.status = GameStatus.RUNNING;
    });
    window.game.onGameClosed(() => {
        console.debug("Game closed");
        gameStore.status = GameStatus.CLOSED;
    });
    gameStore.isInitialized = true;
}
