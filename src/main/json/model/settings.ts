// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type } from "@sinclair/typebox";

export const settingsSchema = Type.Object({
    fullscreen: Type.Boolean({ default: true }),
    size: Type.Number({ default: 900 }),
    displayIndex: Type.Number({ default: 0 }),
    skipIntro: Type.Boolean({ default: false }),
    sfxVolume: Type.Number({ default: 5, minimum: 0, maximum: 100 }),
    musicVolume: Type.Number({ default: 5, minimum: 0, maximum: 100 }),
    loginAutomatically: Type.Boolean({ default: true }),
    devMode: Type.Boolean({ default: false }),
    battlesHideInProgress: Type.Boolean({ default: false }),
    battlesHidePvE: Type.Boolean({ default: false }),
    battlesHideLocked: Type.Boolean({ default: false }),
    battlesHideEmpty: Type.Boolean({ default: true }),
    logUploadUrl: Type.String({ default: "https://log.beyondallreason.dev/" }),
    lobbyServer: Type.String({ default: "wss://server4.beyondallreason.info" }),
    customServerList: Type.Array(Type.String(), { default: [] }),
    endedNormallyFilter: Type.Union([Type.Literal("true"), Type.Literal("false"), Type.Literal("null")], { default: "null" }),
});
