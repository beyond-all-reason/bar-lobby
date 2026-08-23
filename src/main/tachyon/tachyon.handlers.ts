// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { BarIpcWebContents } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { TachyonClientRequestHandlers } from "./tachyon-client";
import { GetCommandData, GetCommandIds, GetCommands } from "tachyon-protocol";
import { BattleStartRequestData, MatchmakingCheckAssetsRequestData } from "tachyon-protocol/types";
import { contentAPI } from "@main/content/content-api";

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
                // data carries the join password, so it is summarised rather than dumped.
                log.info(`Received battle start request for ${data.ip}:${data.port}`);
                const missing = contentAPI.missing([
                    { type: "game", id: data.game.springName },
                    { type: "map", id: data.map.springName },
                    { type: "engine", id: data.engine.version },
                ]);
                if (missing.length > 0) {
                    webContents.send("notifications:showAlert", {
                        text: `Unable to join match, required assets are missing.`,
                        severity: "error",
                    });
                    return { status: "failed", reason: "internal_error" };
                } else {
                    webContents.send("tachyon:battleStart", data);
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
                const missing = contentAPI.missing([
                    { type: "game", id: data.game },
                    ...data.maps.map((id) => ({ type: "map" as const, id })),
                    ...data.engines.map((id) => ({ type: "engine" as const, id })),
                ]);
                if (missing.length > 0) {
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
                        assetStatus: missing.length > 0 ? "missing" : "complete",
                    },
                } satisfies ResponseBody<"matchmaking/checkAssets">;
            })
        ),
    } satisfies Partial<TachyonClientRequestHandlers>;
}
