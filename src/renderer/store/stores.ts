// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { initContentsStore } from "@renderer/store/contents.store";
import { initDownloadsStore } from "@renderer/store/downloads.store";
import { initEnginesStore } from "@renderer/store/engine.store";
import { initGameStore } from "@renderer/store/game.store";
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

// TEMP e2e diagnostics: names of init steps that have started but not settled, and any that rejected.
const e2ePending = new Set<string>();
const e2eRejected: string[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).__e2eInit = { pending: e2ePending, rejected: e2eRejected };

function track<T>(name: string, start: () => Promise<T>): Promise<T> {
    e2ePending.add(name);
    return start().then(
        (value) => {
            e2ePending.delete(name);
            return value;
        },
        (error) => {
            e2ePending.delete(name);
            e2eRejected.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    );
}

export async function initPreMountStores() {
    await Promise.all([
        Promise.all([track("config", initConfigStore), track("settings", initSettingsLogic)]).then(() => track("customLobbies", initCustomLobbiesStore)),
        track("infos", initInfosLogic),
        track("game", initGameStore),
        track("contents", initContentsStore),
        track("downloads", initDownloadsStore),
        track("engines", initEnginesStore),
        track("tachyon", initTachyonStore).then(() =>
            Promise.all([
                track("matchmaking", initMatchmakingLogic),
                track("users", initUsersStore),
                track("me", initMeStore),
                track("lobby", initLobbyStore),
                track("chat", initChatStore),
                track("party", initPartyLogic),
            ])
        ),
    ]);
}
