// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive } from "vue";
import { PrivateUser } from "tachyon-protocol/types";
import { onWentOffline } from "@renderer/utils/offline-signal";
import { createSpringString, SpringConnectionDetails } from "@shared/spring-string";

type MultiplayerBattleConnectionDetails = SpringConnectionDetails & {
    engine: { version: string };
    game: { springName: string };
};

export const tachyonStore = reactive({
    isInitialized: false,
    rejoinModalOpen: false,
    springConnectionDetails: undefined,
} as {
    isInitialized: boolean;
    rejoinModalOpen: boolean;
    springConnectionDetails?: MultiplayerBattleConnectionDetails;
});

function launchMultiplayerBattle(connectionDetails: MultiplayerBattleConnectionDetails) {
    window.game.launchMultiplayer({
        engineVersion: connectionDetails.engine.version,
        gameVersion: connectionDetails.game.springName,
        springString: createSpringString(connectionDetails),
    });
}

function clearRejoin() {
    tachyonStore.springConnectionDetails = undefined;
    tachyonStore.rejoinModalOpen = false;
}

function onUserSelfEventBattle(battle: PrivateUser["currentBattle"]) {
    if (!battle) {
        clearRejoin();
        return;
    }
    tachyonStore.springConnectionDetails = battle;
    tachyonStore.rejoinModalOpen = true;
}

export async function initTachyonStore() {
    if (tachyonStore.isInitialized) {
        console.warn("Tachyon store is already initialized. Skipping initialization.");
        return;
    }

    onWentOffline.add(clearRejoin);

    window.tachyon.onBattleStart((data) => {
        console.debug("Received battle start event", data.ips[0], data.port);
        // tachyon.service.ts checks assets before sending this request here.
        tachyonStore.springConnectionDetails = data;
        launchMultiplayerBattle(data);
    });

    window.tachyon.onEvent("battle/ended", (data) => {
        console.debug("Received battle ended event", data);
        clearRejoin();
    });

    window.tachyon.onEvent("user/self", (data) => onUserSelfEventBattle(data.user.currentBattle));

    tachyonStore.isInitialized = true;
}

export const tachyon = { launchMultiplayerBattle };
