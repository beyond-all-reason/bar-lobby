// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { initContentsStore } from "@renderer/store/contents.store";
import { initDownloadsStore } from "@renderer/store/downloads.store";
import { initEnginesStore } from "@renderer/store/engine.store";
import { initGameStore } from "@renderer/store/game.store";
import { connectionLogic, initConnectionLogic } from "@renderer/logic/connection";
import { initInfosLogic } from "@renderer/logic/infos";
import { initMatchmakingLogic } from "@renderer/logic/matchmaking";
import { initMeStore } from "@renderer/store/me.store";
import { initPartyLogic } from "@renderer/logic/party";

import { initSettingsLogic } from "@renderer/logic/settings";
import { initTachyonStore } from "@renderer/store/tachyon.store";
import { initUsersStore } from "@renderer/store/users.store";
import { initLobbyStore } from "./lobby.store";
import { initChatStore } from "@renderer/store/chat.store";
import { initConfigStore } from "@renderer/store/config.store";
import { initCustomLobbiesStore } from "@renderer/store/custom-lobbies.store";

export async function initPreMountStores() {
    await Promise.all([
        Promise.all([initConfigStore(), initSettingsLogic()]).then(() => initCustomLobbiesStore()),
        initInfosLogic(),
        initGameStore(),
        initContentsStore(),
        initDownloadsStore(),
        initEnginesStore(),
        Promise.all([initConnectionLogic(), initTachyonStore()]).then(() =>
            Promise.all([
                initMatchmakingLogic(),
                initUsersStore(),
                // The stored identity goes in first, so the user/self a restored socket sends replaces it rather than the other way round.
                initMeStore().then(() => connectionLogic.restoreSession()),
                initLobbyStore(),
                initChatStore(),
                initPartyLogic(),
            ])
        ),
    ]);
}
