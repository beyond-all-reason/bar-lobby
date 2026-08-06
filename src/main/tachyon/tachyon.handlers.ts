// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { BarIpcWebContents } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { TachyonClientRequestHandlers } from "./tachyon-client";
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

export function createTachyonRequestHandlers(webContents: BarIpcWebContents): TachyonClientRequestHandlers {
    return {
        ...createBattleHandlers(webContents),
        ...createMatchmakingHandlers(webContents),
    } satisfies TachyonClientRequestHandlers;
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
    } satisfies Partial<TachyonClientRequestHandlers>;
}

function createMatchmakingHandlers(webContents: BarIpcWebContents) {
    return {
        ...defineTachyonRequestHandler(
            "matchmaking/checkAssets",
            createTypedTachyonRequestHandler<"matchmaking/checkAssets">()(async (data: MatchmakingCheckAssetsRequestData) => {
                log.info(`Received matchmaking check assets request: ${JSON.stringify(data)}`);
                const itemsRequired =
                    !gameContentAPI.isVersionInstalled(data.game) ||
                    data.maps.some((map) => !mapContentAPI.isVersionInstalled(map)) ||
                    data.engines.some((engine) => !engineContentAPI.isVersionInstalled(engine));
                if (itemsRequired) {
                    // TODO: This should be through i18n for localization
                    webContents.send("notifications:showAlert", {
                        text: `Party queue rejected, missing assets required for queue ${data.queueId}.`,
                        severity: "error",
                    });
                }
                return {
                    // Reminder, "success" is returned even if some assets are missing, because it is a successful response, not an indication of asset completeness.
                    // Technically we can return "downloading" also, but for now we just return "missing" or "complete"
                    status: "success",
                    data: {
                        assetStatus: itemsRequired ? "missing" : "complete",
                    },
                };
            })
        ),
    } satisfies Partial<TachyonClientRequestHandlers>;
}
