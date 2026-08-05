// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { BarIpcWebContents } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { TachyonClientRequestHandlers } from "./tachyon-client";
import { BattleStartRequestData, MatchmakingCheckAssetsOkResponseData, MatchmakingCheckAssetsRequestData } from "tachyon-protocol/types";
import { gameContentAPI } from "@main/content/game/game-content";
import { mapContentAPI } from "@main/content/maps/map-content";
import { engineContentAPI } from "@main/content/engine/engine-content";

const log = logger("tachyon-handlers");

export function createTachyonRequestHandlers(webContents: BarIpcWebContents): TachyonClientRequestHandlers {
    return {
        ...createBattleHandlers(webContents),
        ...createMatchmakingHandlers(),
    };
}

function createBattleHandlers(webContents: BarIpcWebContents): Pick<TachyonClientRequestHandlers, "battle/start"> {
    return {
        "battle/start": async (data: BattleStartRequestData) => {
            log.info(`Received battle start request: ${JSON.stringify(data)}`);
            const { ip, port, username, password } = data;
            const springString = `spring://${username}:${password}@${ip}:${port}`;
            webContents.send("tachyon:battleStart", springString);
            return {
                status: "success",
            };
        },
    };
}

function createMatchmakingHandlers(): Pick<TachyonClientRequestHandlers, "matchmaking/checkAssets"> {
    return {
        "matchmaking/checkAssets": async (data: MatchmakingCheckAssetsRequestData) => {
            log.info(`Received matchmaking check assets request: ${JSON.stringify(data)}`);
            let itemsRequired: boolean = false;
            if (!gameContentAPI.isVersionInstalled(data.game)) {
                itemsRequired = true;
            }
            for (const map of data.maps) {
                if (!mapContentAPI.isVersionInstalled(map)) {
                    itemsRequired = true;
                    break;
                }
            }
            for (const engine of data.engines) {
                if (!engineContentAPI.isVersionInstalled(engine)) {
                    itemsRequired = true;
                    break;
                }
            }
            // Technically we can return "downloading" if any assets are missing, but for now we just return "missing" or "complete
            const result: MatchmakingCheckAssetsOkResponseData = {
                assetStatus: itemsRequired ? "missing" : "complete",
            };
            return {
                status: "success",
                result: result,
                invalid: true,
            };
        },
    };
}
