// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { BarIpcWebContents } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { TachyonClientRequestHandlers } from "./tachyon-client";
import { BattleStartRequestData, MatchmakingCheckAssetsRequestData } from "tachyon-protocol/types";

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
            return {
                status: "failed",
                reason: "command_unimplemented",
                details: "This client does not yet check assets, and instead auto-fails.",
            };
        },
    };
}
