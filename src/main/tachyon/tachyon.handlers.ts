// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { BarIpcWebContents } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { PartialTachyonClientRequestHandlers, TachyonClientRequestHandlers } from "./tachyon-client";
import { GetCommandData, GetCommandIds, GetCommands } from "tachyon-protocol";
import { BattleStartRequestData, MatchmakingCheckAssetsRequestData } from "tachyon-protocol/types";
import { gameContentAPI } from "@main/content/game/game-content";
import { mapContentAPI } from "@main/content/maps/map-content";
import { engineContentAPI } from "@main/content/engine/engine-content";

const log = logger("tachyon-handlers");

type ServerToUserRequestId = GetCommandIds<"server", "user", "request">;
type RequestData<C extends ServerToUserRequestId> = GetCommandData<GetCommands<"server", "user", "request", C>>;
type ResponseBody<C extends ServerToUserRequestId> = Omit<GetCommands<"user", "server", "response", C>, "type" | "commandId" | "messageId">;
type Exact<Expected, Actual extends Expected> = Expected & Record<Exclude<keyof Actual, keyof Expected>, never>;

const createTypedTachyonRequestHandler =
    <C extends ServerToUserRequestId>() =>
    <R extends ResponseBody<C>>(handler: (data: RequestData<C>) => Promise<Exact<ResponseBody<C>, R>>) =>
        handler;

function defineTachyonRequestHandler<C extends ServerToUserRequestId, R extends ResponseBody<C>>(
    commandId: C,
    handler: (data: RequestData<C>) => Promise<Exact<ResponseBody<C>, R>>
): Pick<TachyonClientRequestHandlers, C> {
    return {
        [commandId]: handler,
    } as unknown as Pick<TachyonClientRequestHandlers, C>;
}

export function createTachyonRequestHandlers(webContents: BarIpcWebContents): PartialTachyonClientRequestHandlers {
    return {
        ...createBattleHandlers(webContents),
        ...createMatchmakingHandlers(),
    };
}

function createBattleHandlers(webContents: BarIpcWebContents) {
    return {
        ...defineTachyonRequestHandler(
            "battle/start",
            createTypedTachyonRequestHandler<"battle/start">()(async (data: BattleStartRequestData) => {
                log.info(`Received battle start request: ${JSON.stringify(data)}`);
                const { ip, port, username, password } = data;
                const springString = `spring://${username}:${password}@${ip}:${port}`;
                webContents.send("tachyon:battleStart", springString);
                return {
                    status: "success",
                };
            })
        ),
    } satisfies PartialTachyonClientRequestHandlers;
}

function createMatchmakingHandlers() {
    return {
        ...defineTachyonRequestHandler(
            "matchmaking/checkAssets",
            createTypedTachyonRequestHandler<"matchmaking/checkAssets">()(async (data: MatchmakingCheckAssetsRequestData) => {
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
                // Technically we can return "downloading" if any assets are missing, but for now we just return "missing" or "complete"
                return {
                    status: "success",
                    data: {
                        assetStatus: itemsRequired ? "missing" : "complete",
                    },
                };
            })
        ),
    } satisfies PartialTachyonClientRequestHandlers;
}
