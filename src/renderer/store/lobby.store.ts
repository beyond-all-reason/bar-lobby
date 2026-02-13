// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { LobbyListResetEventData, LobbyListUpdatedEventData, LobbyOverview } from "tachyon-protocol/types";
import { reactive } from "vue";
import { apply as applyPatch } from "json8-merge-patch";
import { notificationsApi } from "@renderer/api/notifications";

type LobbyId = string;

export const lobbyStore: {
    isInitialized: boolean;
    lobbies: Record<LobbyId, LobbyOverview>;
    isSubscribedToList: boolean;
} = reactive({
    isInitialized: false,
    lobbies: {}, //This will hold changes from ``lobby/listUpdated`` events
    isSubscribedToList: false,
});

export async function initLobbyStore() {
    window.tachyon.onEvent("lobby/listUpdated", onListUpdatedEvent);
    window.tachyon.onEvent("lobby/listReset", onLobbyListResetEvent);
    lobbyStore.isInitialized = true;
}

function onListUpdatedEvent(data: LobbyListUpdatedEventData) {
    if (!lobbyStore.isSubscribedToList) return;
    console.log("Tachyon event: lobby/listUpdated:", data);
    lobbyStore.lobbies = applyPatch(lobbyStore.lobbies, data.lobbies);
}

function onLobbyListResetEvent(data: LobbyListResetEventData) {
    if (!lobbyStore.isSubscribedToList) return;
    console.log("Tachyon event: lobby/listReset", data);
    lobbyStore.lobbies = data.lobbies;
}

async function subscribeList() {
    try {
        const response = await window.tachyon.request("lobby/subscribeList");
        //Per Tachyon protocol, this subscribes us, but does not return an updated list, that happens in the ListUpdated or ListReset events.
        console.log("subscribeList:", response.status);
        lobbyStore.isSubscribedToList = true;
    } catch (error) {
        console.error("Error with request lobby/subscribeList:", error);
        notificationsApi.alert({
            text: "Error with request lobby/subscribeList",
            severity: "error",
        });
        lobbyStore.isSubscribedToList = false;
        lobbyStore.lobbies = {};
    }
}

async function unsubscribeList() {
    try {
        await window.tachyon.request("lobby/unsubscribeList");
        lobbyStore.isSubscribedToList = false;
        lobbyStore.lobbies = {};
    } catch (error) {
        console.error("Error with request lobby/unsubscribeList:", error);
        notificationsApi.alert({
            text: "Error with request lobby/subscribeList",
            severity: "error",
        });
    }
}

export const lobby = {
    subscribeList,
    unsubscribeList,
};
