// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { GameVersion } from "@main/content/game/game-version";
import { LuaOption } from "@main/content/game/lua-options";
import { Replay } from "@main/content/replays/replay";
import { BattleWithMetadata } from "@main/game/battle/battle-types";
import { notificationsApi } from "@renderer/api/notifications";
import { sortGameVersionsByVersionDesc } from "@renderer/utils/game-version-sort";
import { reactive, watch } from "vue";

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

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
    availableGameVersions: Map<string, GameVersion>;
} = reactive({
    isInitialized: false,
    status: GameStatus.CLOSED,
    availableGameVersions: new Map(),
});

async function refreshStore() {
    const installedVersions = sortGameVersionsByVersionDesc(await window.game.getInstalledVersions());
    gameStore.availableGameVersions.clear();
    for (const version of installedVersions) {
        gameStore.availableGameVersions.set(version.gameVersion, version);
    }
    gameStore.selectedGameVersion = installedVersions[0];
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

export async function refreshGameStore() {
    gameStore.availableGameVersions.clear();
    gameStore.selectedGameVersion = undefined;
    await refreshStore();
}

export async function downloadGame(version: string) {
    try {
        await window.game.downloadGame(version);
        await refreshStore();
    } catch (error) {
        console.error(`DownloadGame for ${version} failed:`, error);
        notificationsApi.alert({ text: getErrorMessage(error, "Game download failed."), severity: "error" });
    }
}

export async function startBattle(battle: BattleWithMetadata) {
    try {
        gameStore.status = GameStatus.LOADING;
        await window.game.launchBattle(battle);
        gameStore.status = GameStatus.RUNNING;
    } catch (error) {
        console.error("Failed to start battle:", error);
        gameStore.status = GameStatus.CLOSED;
        notificationsApi.alert({ text: getErrorMessage(error, "startBattle failed"), severity: "error" });
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
        notificationsApi.alert({ text: getErrorMessage(error, "watchReplay failed"), severity: "error" });
    }
}

export async function initGameStore() {
    if (gameStore.isInitialized) return;
    await refreshStore();
    window.downloads.onDownloadGameComplete(async (downloadInfo) => {
        console.debug("Received game download completed event", downloadInfo);
        await refreshStore();
    });
    window.downloads.onDownloadGameFail(async (downloadInfo) => {
        console.error("Game download failed", downloadInfo);
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
