// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcCall } from "@renderer/api/ipc-call";
import type { SingleplayerItemRef } from "@shared/content/singleplayer";

export const singleplayerApi = {
    // Rescans the content roots, so content added since the last call shows up.
    list: () => ipcCall("singleplayer:list", () => window.singleplayer.list()),
    getCampaign: ({ source, rootId, id }: SingleplayerItemRef) => ipcCall("singleplayer:getCampaign", () => window.singleplayer.getCampaign(source, rootId, id)),
    getScenario: ({ source, rootId, id }: SingleplayerItemRef) => ipcCall("singleplayer:getScenario", () => window.singleplayer.getScenario(source, rootId, id)),
    getTutorial: ({ source, rootId, id }: SingleplayerItemRef) => ipcCall("singleplayer:getTutorial", () => window.singleplayer.getTutorial(source, rootId, id)),
};
