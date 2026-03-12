// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import {
    LobbyListResetEventData,
    LobbyListUpdatedEventData,
    LobbyOverview,
    LobbyCreateRequestData,
    LobbyJoinRequestData,
    LobbyCreateOkResponseData,
    LobbyJoinOkResponseData,
    LobbyAddBotRequestData,
    LobbyRemoveBotRequestData,
    LobbyUpdateBotRequestData,
    LobbyUpdateRequestData,
    LobbyUpdatedEventData,
    LobbyLeftEventData,
} from "tachyon-protocol/types";
import { reactive } from "vue";
import { apply as applyPatch } from "json8-merge-patch";
import { notificationsApi } from "@renderer/api/notifications";
import { Lobby } from "@renderer/model/lobby";
import { setupI18n } from "@renderer/i18n";
import { subsManager } from "@renderer/store/users.store";
import { db } from "@renderer/store/db";
import { battleStore, battleActions } from "@renderer/store/battle.store";
import { router } from "@renderer/router";

const i18n = setupI18n();

const lobbySymbol = Symbol("lobby.store");

type LobbyId = string;

export const lobbyStore: {
    isInitialized: boolean;
    lobbies: Record<LobbyId, LobbyOverview>;
    selectedLobby: LobbyOverview | null;
    activeLobby?: Lobby | null;
} = reactive({
    isInitialized: false,
    lobbies: {}, //This will hold changes from ``lobby/listUpdated`` events
    selectedLobby: null,
    activeLobby: null,
});

export async function initLobbyStore() {
    window.tachyon.onEvent("lobby/listUpdated", onListUpdatedEvent);
    window.tachyon.onEvent("lobby/listReset", onLobbyListResetEvent);
    window.tachyon.onEvent("lobby/updated", onLobbyUpdatedEvent);
    window.tachyon.onEvent("lobby/left", onLobbyLeftEvent);
    lobbyStore.isInitialized = true;
}

function onListUpdatedEvent(data: LobbyListUpdatedEventData) {
    console.log("Tachyon event: lobby/listUpdated:", data);
    lobbyStore.lobbies = applyPatch(lobbyStore.lobbies, data.lobbies);
    clearSelectedLobbyIfNull();
}

function onLobbyListResetEvent(data: LobbyListResetEventData) {
    console.log("Tachyon event: lobby/listReset", data);
    lobbyStore.lobbies = data.lobbies;
    clearSelectedLobbyIfNull();
}

async function requestSubscribeList() {
    try {
        const response = await window.tachyon.request("lobby/subscribeList");
        //Per Tachyon protocol, this subscribes us, but does not return an updated list, that happens in the ListUpdated or ListReset events.
        console.log("subscribeList:", response.status);
    } catch (error) {
        console.error("Error with request lobby/subscribeList:", error);
        notificationsApi.alert({
            text: "Error with request lobby/subscribeList",
            severity: "error",
        });
    }
}

async function requestUnsubscribeList() {
    try {
        await window.tachyon.request("lobby/unsubscribeList");
    } catch (error) {
        console.error("Error with request lobby/unsubscribeList:", error);
        notificationsApi.alert({
            text: "Error with request lobby/unsubscribeList",
            severity: "error",
        });
    }
}

async function requestCreateLobby(data: LobbyCreateRequestData) {
    try {
        battleActions.resetToDefaultBattle(undefined, undefined, undefined, true);
        const response = await window.tachyon.request("lobby/create", data);
        console.log("Tachyon: lobby/create:", response.status, response.data);
        parseLobbyResponseData(response.data, false);
        router.push("/play/lobby");
    } catch (error) {
        console.error("Error with request lobby/create", error);
        notificationsApi.alert({
            text: "Error with request lobby/create",
            severity: "error",
        });
    }
}

async function requestJoinLobby(id: LobbyJoinRequestData) {
    try {
        battleActions.resetToDefaultBattle(undefined, undefined, undefined, true);
        const response = await window.tachyon.request("lobby/join", id);
        console.log("Tachyon: lobby/join:", response.status, response.data);
        parseLobbyResponseData(response.data, false);
        router.push("/play/lobby");
    } catch (error) {
        console.error("Error with request lobby/join", error);
        notificationsApi.alert({
            text: "Error with request lobby/join",
            severity: "error",
        });
    }
}

async function requestJoinAllyTeam(allyTeam: string) {
    try {
        const response = await window.tachyon.request("lobby/joinAllyTeam", { allyTeam: allyTeam });
        console.log("Tachyon: lobby/joinAllyTeam", response);
    } catch (error) {
        console.error("Tachyon error: lobby/joinAllyTeam:", error);
        notificationsApi.alert({
            text: "Error with request lobby/joinAllyTeam",
            severity: "error",
        });
    }
}

async function requestJoinQueue() {
    try {
        const response = await window.tachyon.request("lobby/joinQueue");
        console.log("Tachyon: lobby/joinQueue:", response);
    } catch (error) {
        console.error("Tachyon error: lobby/joinQueue:", error);
        notificationsApi.alert({
            text: "Error with request lobby/joinQueue",
            severity: "error",
        });
    }
}

async function requestSpectate() {
    try {
        const response = await window.tachyon.request("lobby/spectate");
        console.log("Tachyon: lobby/spectate", response);
    } catch (error) {
        console.error("Tachyon error: lobby/spectate:", error);
        notificationsApi.alert({
            text: "Error with request lobby/spectate",
            severity: "error",
        });
    }
}

// Sorts the playerQueue based on the indices because we cannot assume they will be exclusively positive or consecutive integers
function toSortedPlayerQueue(map: Map<number, string>): Map<number, string> {
    return new Map(Array.from(map.entries()).toSorted(([a], [b]) => a - b));
}

// This will normalize different event/response data(s) and apply them to the lobbyStore.activeLobby object.
function parseLobbyResponseData(data: LobbyCreateOkResponseData | LobbyJoinOkResponseData | LobbyUpdatedEventData, isUpdate: boolean) {
    // Check if we are getting an updated event or a join/create response
    if (isUpdate) {
        if (!lobbyStore.activeLobby) {
            console.warn("Lobby update received but we have no active lobby. Skipping update.");
            return;
        }
        if (lobbyStore.activeLobby.id != data.id) {
            console.warn("Lobby update did not match active lobby ID. Skipping update.");
            return;
        }
        //Apply the patch for an updated event
        lobbyStore.activeLobby = applyPatch(lobbyStore.activeLobby, data);
    } else {
        //Apply the patch for a join/create response
        lobbyStore.activeLobby = applyPatch({}, data);
    }
    if (!lobbyStore.activeLobby) {
        console.error("Active Lobby is null or undefined after applyPatch. This should never happen!");
        return;
    }
    //Updates are not guaranteed to change all things, so we check if each property was part of the update before working with it on the stores.
    if (data.engineVersion) {
        battleStore.battleOptions.engineVersion = lobbyStore.activeLobby.engineVersion;
    }
    if (data.gameVersion) {
        battleStore.battleOptions.gameVersion = lobbyStore.activeLobby.gameVersion;
    }
    if (data.mapName) {
        db.maps.get(data.mapName).then((map) => {
            if (map == undefined) {
                console.error(`Error in parseLobbyResponseData(), ${data.mapName} is undefined in database.`);
                notificationsApi.alert({ text: `Error in lobby data, ${data.mapName} not found.`, severity: "error" });
            }
            battleStore.battleOptions.map = map;
        });
    }
    if (data.allyTeamConfig) {
        // TODO: we shouldn't have to reset the startboxes like this, but since the player can go into a skirmish
        // setup, and mess with battleStore/Options, we're going to do this here anyway. Later, we want to make
        // a better solution to prevent this issue. Most likely, we just will deny the player access to any
        // single-player setup screens unless they quit the online lobby first.
        battleStore.battleOptions.mapOptions.customStartBoxes = [];
        for (const allyKey in lobbyStore.activeLobby.allyTeamConfig) {
            battleStore.battleOptions.mapOptions.customStartBoxes.push(lobbyStore.activeLobby.allyTeamConfig[allyKey].startBox);
        }
        // It's only possible to change max player count if the team config changed, so we run that here too.
        lobbyStore.activeLobby.maxPlayerCount = getMaxPlayerCountFromAllyTeamConfig(lobbyStore.activeLobby.allyTeamConfig);
    }
    if (data.spectators) {
        // Build the spectator queue list
        const tempMap: Map<number, string> = new Map();
        for (const memberKey in lobbyStore.activeLobby.spectators) {
            const member = lobbyStore.activeLobby.spectators[memberKey];
            if (member.joinQueuePosition != null) {
                tempMap.set(member.joinQueuePosition, member.id);
            }
        }
        lobbyStore.activeLobby.playerQueue = toSortedPlayerQueue(tempMap);
    }

    lobbyStore.activeLobby.playerCount = Object.keys(lobbyStore.activeLobby.players).length;
    lobbyStore.activeLobby.spectatorCount = Object.keys(lobbyStore.activeLobby.spectators).length;
    lobbyStore.activeLobby.botCount = Object.keys(lobbyStore.activeLobby.bots).length;

    // Manage our User subscriptions after updated/joined/created
    subsManager.setList([...Object.keys(lobbyStore.activeLobby.players), ...Object.keys(lobbyStore.activeLobby.spectators)], lobbySymbol);
    return;
}

async function requestLeaveLobby() {
    try {
        const response = await window.tachyon.request("lobby/leave");
        console.log("Tachyon: lobby/leave:", response.status);
    } catch (error) {
        console.error("Error with request lobby/leave", error);
        notificationsApi.alert({
            text: "Error with request lobby/leave",
            severity: "error",
        });
    }
    // If we ever use a specific view for a lobby instead of BattleDrawer, we need to push a route here
    clearUserSubscriptions();
    lobbyStore.activeLobby = undefined;
    //battleStore.isLobbyOpened = false;
}

// This is a *request* for the battle to start, but 'battle/start' event received will actually trigger the client to launch the game.
async function requestStartBattle() {
    try {
        const response = await window.tachyon.request("lobby/startBattle");
        console.log("Tachyon: lobby/startBattle:", response.status);
    } catch (error) {
        console.error("Error with request lobby/startBattle", error);
        notificationsApi.alert({
            text: "Error with request lobby/startBattle",
            severity: "error",
        });
    }
}

async function requestAddBot(data: LobbyAddBotRequestData) {
    try {
        const response = await window.tachyon.request("lobby/addBot", data);
        console.log("Tachyon lobby/addBot", response);
    } catch (error) {
        console.error("Error with request lobby/addBot", error);
        notificationsApi.alert({
            text: "Error with request lobby/addBot",
            severity: "error",
        });
    }
}

async function requestRemoveBot(data: LobbyRemoveBotRequestData) {
    try {
        const response = await window.tachyon.request("lobby/removeBot", data);
        console.log("Tachyon lobby/removeBot:", response);
    } catch (error) {
        console.error("Error with request lobby/removeBot", error);
        notificationsApi.alert({
            text: "Error with request lobby/removeBot",
            severity: "error",
        });
    }
}

async function requestUpdateBot(data: LobbyUpdateBotRequestData) {
    try {
        const response = await window.tachyon.request("lobby/updateBot", data);
        console.log("Tachyon lobby/updateBot:", response);
    } catch (error) {
        console.error("Error with request lobby/updateBot", error);
        notificationsApi.alert({
            text: "Error with request lobby/updateBot",
            severity: "error",
        });
    }
}

async function requestLobbyUpdate(data: LobbyUpdateRequestData) {
    try {
        const response = await window.tachyon.request("lobby/update", data);
        console.log("Tachyon lobby/update:", response);
    } catch (error) {
        console.error("Error with request lobby/update", error);
        notificationsApi.alert({ text: "Error with request lobby/update", severity: "error" });
    }
}

function clearSelectedLobbyIfNull() {
    if (lobbyStore.selectedLobby && lobbyStore.lobbies[lobbyStore.selectedLobby.id] == null) {
        lobbyStore.selectedLobby = null;
    }
}

function onLobbyUpdatedEvent(data: LobbyUpdatedEventData) {
    console.log("Tachyon event: lobby/updated:", data);
    parseLobbyResponseData(data, true);
    console.log("activeLobby is:", lobbyStore.activeLobby);
}

function onLobbyLeftEvent(data: LobbyLeftEventData) {
    if (!lobbyStore.activeLobby || lobbyStore.activeLobby.id != data.id) return;
    clearUserSubscriptions();
    lobbyStore.activeLobby = undefined;
    console.log("Tachyon event: lobby/left:", data);
    if (router.currentRoute.value.path == "/play/lobby") {
        // We use replace instead of push so the user can't use "back".
        router.replace("/play/customLobbies");
    }
    notificationsApi.alert({
        text: i18n.global.t("lobby.multiplayer.custom.removedFromLobby"),
        severity: "info",
    });
}

function getMaxPlayerCountFromAllyTeamConfig(config: Lobby["allyTeamConfig"]): number {
    let maxPlayerCount: number = 0;
    for (const allyTeam of Object.values(config)) {
        for (const team of Object.values(allyTeam.teams)) {
            maxPlayerCount += team.maxPlayers;
        }
    }
    return maxPlayerCount;
}

async function clearUserSubscriptions() {
    subsManager.clearAllFromList(lobbySymbol);
}

export const lobby = {
    requestSubscribeList,
    requestUnsubscribeList,
    requestCreateLobby,
    requestJoinLobby,
    requestLeaveLobby,
    requestStartBattle,
    requestJoinAllyTeam,
    requestJoinQueue,
    requestSpectate,
    requestAddBot,
    requestRemoveBot,
    requestUpdateBot,
    requestLobbyUpdate,
};
