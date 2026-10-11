// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type } from "@sinclair/typebox";

import { UI_SCALE_MAX, UI_SCALE_MIN } from "@main/config/window";
import { DEFAULT_LOBBY_LIST_QUERY, lobbyListQuerySchema } from "@shared/lobby-list-query";

export const settingsSchema = Type.Object({
    fullscreen: Type.Boolean({ default: true }),
    maximized: Type.Boolean({ default: false }),
    windowWidth: Type.Number({ default: 1280 }),
    windowHeight: Type.Number({ default: 720 }),
    displayIndex: Type.Number({ default: 0 }),
    uiScale: Type.Union([Type.Number({ minimum: UI_SCALE_MIN, maximum: UI_SCALE_MAX }), Type.Null()], { default: null }),
    skipIntro: Type.Boolean({ default: false }),
    sfxVolume: Type.Number({ default: 5, minimum: 0, maximum: 100 }),
    musicVolume: Type.Number({ default: 5, minimum: 0, maximum: 100 }),
    loginAutomatically: Type.Boolean({ default: true }),
    devMode: Type.Boolean({ default: false }),
    customLobbiesQuery: Type.Object(lobbyListQuerySchema.properties, { default: DEFAULT_LOBBY_LIST_QUERY }),
    // The server the selected lobby tags were chosen on. Tags come from the server, so they mean nothing on another one.
    customLobbiesTagsServer: Type.String({ default: "" }),
    customLobbiesAutoRefresh: Type.Boolean({ default: false }),
    useDefaultServer: Type.Boolean({ default: true }),
    lobbyServerOverride: Type.String({ default: "" }),
    customServerList: Type.Array(Type.String(), { default: [] }),
    endedNormallyFilter: Type.Union([Type.Literal("true"), Type.Literal("false"), Type.Literal("null")], { default: "null" }),
    assetsPath: Type.String({ default: "" }),
    language: Type.Union([Type.String(), Type.Null()], { default: null }),
});
