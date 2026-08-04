// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { contentAPI } from "@main/content/content-api";
import { getScenarios } from "@main/content/game/game-scenarios";
import { gameAPI, MultiplayerLaunchSettings } from "@main/game/game";
import { ipcMain, BarIpcWebContents } from "@main/typed-ipc";
import { Replay } from "@main/content/replays/replay";
import { BattleWithMetadata } from "@main/game/battle/battle-types";
import { replayContentAPI } from "@main/content/replays/replay-content";

function registerIpcHandlers(webContents: BarIpcWebContents) {
    // Content
    ipcMain.handle("game:downloadGame", (_, version: string) => contentAPI.ensure([{ type: "game", id: version }]));
    ipcMain.handle("game:getScenarios", (_, version: string) => {
        const installed = contentAPI.gameVersion(version);

        return installed ? getScenarios(installed.packageMd5) : [];
    });
    ipcMain.handle("game:getInstalledVersions", () => contentAPI.gameVersions());
    ipcMain.handle("game:isVersionInstalled", (_, id: string) => contentAPI.isPresent({ type: "game", id }));
    ipcMain.handle("game:uninstallVersion", (_, version: string) => contentAPI.remove([{ type: "game", id: version }]));

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
    registerIpcHandlers,
};

export default gameService;
