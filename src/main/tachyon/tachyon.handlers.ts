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
type StripEnvelope<T> = T extends object ? Omit<T, "type" | "commandId" | "messageId"> : never;
type ResponseBody<C extends ServerToUserRequestId> = StripEnvelope<GetCommands<"user", "server", "response", C>>;

const createTypedTachyonRequestHandler =
    <C extends ServerToUserRequestId>() =>
    (handler: (data: RequestData<C>) => Promise<ResponseBody<C>>) =>
        handler;

function defineTachyonRequestHandler<C extends ServerToUserRequestId>(commandId: C, handler: (data: RequestData<C>) => Promise<ResponseBody<C>>): Pick<TachyonClientRequestHandlers, C> {
    return {
        [commandId]: handler,
    } as Pick<TachyonClientRequestHandlers, C>;
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
                const itemsRequired =
                    !gameContentAPI.isVersionInstalled(data.game.springName) || !mapContentAPI.isVersionInstalled(data.map.springName) || !engineContentAPI.isVersionInstalled(data.engine.version);
                if (itemsRequired) {
                    webContents.send("notifications:showAlert", {
                        text: `Unable to join match, required assets are missing.`,
                        severity: "error",
                    });
                    return { status: "failed", reason: "internal_error" };
                } else {
                    const { ip, port, username, password } = data;
                    const springString = `spring://${username}:${password}@${ip}:${port}`;
                    webContents.send("tachyon:battleStart", springString, data);
                    return {
                        status: "success",
                    };
                }
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
                } satisfies ResponseBody<"matchmaking/checkAssets">;
            })
        ),
    } satisfies Partial<TachyonClientRequestHandlers>;
}
