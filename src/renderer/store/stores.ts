// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { initContentsStore } from "@renderer/store/contents.store";
import { initDownloadsStore } from "@renderer/store/downloads.store";
import { initEnginesStore } from "@renderer/store/engine.store";
import { initGameStore } from "@renderer/store/game.store";
import { initInfosLogic } from "@renderer/logic/infos";
import { initializeMatchmakingStore } from "@renderer/store/matchmaking.store";
import { initMeStore } from "@renderer/store/me.store";
import { initPartyLogic } from "@renderer/logic/party";
import { initSingleplayerLogic } from "@renderer/logic/singleplayer";

import { initSettingsStore } from "@renderer/store/settings.store";
import { initTachyonStore } from "@renderer/store/tachyon.store";
import { initUsersStore } from "@renderer/store/users.store";
import { initLobbyStore } from "./lobby.store";
import { initChatStore } from "@renderer/store/chat.store";
import { initConfigStore } from "@renderer/store/config.store";
import { initCustomLobbiesStore } from "@renderer/store/custom-lobbies.store";

export async function initPreMountStores() {
    await Promise.all([
        Promise.all([initConfigStore(), initSettingsStore()]).then(() => initCustomLobbiesStore()),
        initInfosLogic(),
        initSingleplayerLogic(),
        initGameStore(),
        initContentsStore(),
        initDownloadsStore(),
        initEnginesStore(),
        initTachyonStore().then(() => Promise.all([initializeMatchmakingStore(), initUsersStore(), initMeStore(), initLobbyStore(), initChatStore(), initPartyLogic()])),
    ]);
}
