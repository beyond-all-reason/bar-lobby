// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { initDownloadsStore } from "@renderer/store/downloads.store";
import { initEnginesStore } from "@renderer/store/engine.store";
import { initGameStore } from "@renderer/store/game.store";
import { initInfosStore } from "@renderer/store/infos.store";
import { initializeMatchmakingStore } from "@renderer/store/matchmaking.store";
import { initMeStore } from "@renderer/store/me.store";

import { initSettingsStore } from "@renderer/store/settings.store";
import { initTachyonStore } from "@renderer/store/tachyon.store";
import { initUsersStore } from "@renderer/store/users.store";

export async function initPreMountStores() {
    await Promise.all([
        initSettingsStore(),
        initInfosStore(),
        initGameStore(),
        initDownloadsStore(),
        initEnginesStore(),
        initTachyonStore().then(() => Promise.all([initializeMatchmakingStore(), initUsersStore(), initMeStore()])),
    ]);
}
