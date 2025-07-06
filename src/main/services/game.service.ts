// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { gameContentAPI } from "@main/content/game/game-content";
import { gameAPI, MultiplayerLaunchSettings } from "@main/game/game";
import { ipcMain, BarIpcWebContents } from "@main/typed-ipc";
import { Replay } from "@main/content/replays/replay";
import { BattleWithMetadata } from "@main/game/battle/battle-types";
import { replayContentAPI } from "@main/content/replays/replay-content";

async function init() {
    await gameContentAPI.init();
}

function registerIpcHandlers(webContents: BarIpcWebContents) {
    // Content
    ipcMain.handle("game:downloadGame", (_, version: string) => gameContentAPI.downloadGame(version));
    ipcMain.handle("game:getScenarios", (_, version: string) => gameContentAPI.getScenarios(version));
    ipcMain.handle("game:getInstalledVersions", () => gameContentAPI.availableVersions.values().toArray());
    ipcMain.handle("game:isVersionInstalled", (_, id: string) => gameContentAPI.isVersionInstalled(id));
    ipcMain.handle("game:uninstallVersion", (_, version: string) => gameContentAPI.uninstallVersionById(version));
    ipcMain.handle("game:preloadPoolData", () => gameContentAPI.preloadPoolData());

    // Game
    ipcMain.handle("game:launchMultiplayer", (_, settings: MultiplayerLaunchSettings) => gameAPI.launchMultiplayer(settings));
    ipcMain.handle("game:launchScript", (_, scriptString: string, gameVersionString: string, engineVersionString: string) =>
        gameAPI.launchScript({ script: scriptString, engineVersion: engineVersionString, gameVersion: gameVersionString })
    );
    ipcMain.handle("game:launchReplay", (_, replay: Replay) => gameAPI.launchReplay(replay));
    ipcMain.handle("game:launchBattle", async (_, battle: BattleWithMetadata) => gameAPI.launchBattle(battle));

    // Events
    gameAPI.onGameLaunched.add(() => {
        webContents.send("game:launched");
    });
    gameAPI.onGameClosed.add(() => {
        webContents.send("game:closed");
        replayContentAPI.cacheReplaysInQueue();
    });
}

const gameService = {
    init,
    registerIpcHandlers,
};

export default gameService;
