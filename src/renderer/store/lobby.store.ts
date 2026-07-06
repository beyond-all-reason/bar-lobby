// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// TODO: We need to handle error responses with translated strings for the notifications.
// We will need to use the failure reasons (e.g. "unauthorized") to pick a i18n string.

import {
    LobbyListResetEventData,
    LobbyListUpdatedEventData,
    LobbyOverview,
    LobbyCreateRequestData,
    LobbyCreateOkResponseData,
    LobbyJoinOkResponseData,
    LobbyAddBotRequestData,
    LobbyRemoveBotRequestData,
    LobbyUpdateBotRequestData,
    LobbyUpdateRequestData,
    LobbyUpdatedEventData,
    LobbyLeftEventData,
    LobbyVoteEndedEventData,
    LobbyVoteSubmitRequestData,
    LobbyUpdateClientStatusRequestData,
    UserId,
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
    selectedLobby?: LobbyOverview;
    activeLobby?: Lobby;
} = reactive({
    isInitialized: false,
    lobbies: {},
    selectedLobby: undefined,
    activeLobby: undefined,
});

export async function initLobbyStore() {
    window.tachyon.onEvent("lobby/listUpdated", onListUpdatedEvent);
    window.tachyon.onEvent("lobby/listReset", onLobbyListResetEvent);
    window.tachyon.onEvent("lobby/updated", onLobbyUpdatedEvent);
    window.tachyon.onEvent("lobby/left", onLobbyLeftEvent);
    window.tachyon.onEvent("lobby/voteEnded", onLobbyVoteEndedEvent);
    lobbyStore.isInitialized = true;
}

function onListUpdatedEvent(data: LobbyListUpdatedEventData) {
    console.log("Tachyon event: lobby/listUpdated:", data);
    lobbyStore.lobbies = applyPatch(lobbyStore.lobbies, data.lobbies);
    clearSelectedLobbyIfUndefined();
}

function onLobbyListResetEvent(data: LobbyListResetEventData) {
    console.log("Tachyon event: lobby/listReset", data);
    lobbyStore.lobbies = data.lobbies;
    clearSelectedLobbyIfUndefined();
}

function onLobbyVoteEndedEvent(data: LobbyVoteEndedEventData) {
    console.log("Tachyon event: lobby/voteEnded", data);
    //TODO: If we want to trigger notifications this is the place to do it.
}

/**
 * Subscribes to the lobby list updates.
 */
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

/**
 * Unsubscribes from future lobby list updates.
 */
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

/**
 * Sends a request to create a new lobby with the provided data.
 * @param data Required data for creating a new lobby.
 */
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

/**
 * Sends a request to join an existing lobby with the provided ID.
 * @param id The ID of the lobby to join.
 */
async function requestJoinLobby(id: string) {
    try {
        battleActions.resetToDefaultBattle(undefined, undefined, undefined, true);
        const response = await window.tachyon.request("lobby/join", { id: id });
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

/**
 * Requests to join an ally team in the lobby.
 * @param allyTeam - The ally team to join.
 */
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

/**
 * Request to join the player queue in the lobby.
 */
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

/**
 * Request to join the spectator queue in the lobby.
 */
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

/**
 * Sorts the player queue map by the joinQueuePosition and returns a new Map with the sorted entries.
 * @param map The Map to be sorted.
 * @returns A new Map with the entries sorted by joinQueuePosition.
 */
function toSortedPlayerQueue(map: Map<number, string>): Map<number, string> {
    return new Map(Array.from(map.entries()).toSorted(([a], [b]) => a - b));
}

/**
 * Normalizes different event/response data(s) and apply them to the lobbyStore.activeLobby object.
 * @param data Lobby create, join, or updated event data packets
 * @param isUpdate Flag to indicate if this is an update only
 * @returns void
 */
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
        battleStore.battleOptions.mapOptions.customStartBoxes = Object.values(lobbyStore.activeLobby.allyTeamConfig).map((c) => c.startBox);
        // It's only possible to change max player count if the team config changed, so we run that here too.
        lobbyStore.activeLobby.maxPlayerCount = getMaxPlayerCountFromAllyTeamConfig(lobbyStore.activeLobby.allyTeamConfig);
    }
    if (data.spectators) {
        // Build the spectator queue list
        const tempMap: Map<number, string> = new Map();
        for (const member of Object.values(lobbyStore.activeLobby.spectators)) {
            if (member.joinQueuePosition !== undefined) {
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

/**
 * Sends a request to leave the currently active lobby.
 */
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
}

/**
 * Sends a request to start the battle in the currently active lobby.
 * Note: This does not guarantee the battle will start, as the server may reject the request.
 * The clients will receive a 'battle/start' event if the battle is successfully started.
 */
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

/**
 * Request to add a bot player to the lobby with the provided data.
 * @param data Required data to fulfill this request
 */
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

/**
 * Request to remove a bot player from the lobby with the provided data.
 * @param data Required data to fulfill this request
 */
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

/**
 * Request to update a bot player in the lobby with the provided data.
 * @param data Required data to fulfill this request
 */
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

/**
 * Request an update to the lobby settings with the provided data.
 * @param data Required data to fulfill this request
 */
async function requestLobbyUpdate(data: LobbyUpdateRequestData) {
    try {
        const response = await window.tachyon.request("lobby/update", data);
        console.log("Tachyon lobby/update:", response);
    } catch (error) {
        console.error("Error with request lobby/update", error);
        notificationsApi.alert({ text: "Error with request lobby/update", severity: "error" });
    }
}

/**
 * In case a lobby is selected when a list update removes it, this removes it from being selected.
 */
function clearSelectedLobbyIfUndefined() {
    if (lobbyStore.selectedLobby && !(lobbyStore.selectedLobby.id in lobbyStore.lobbies)) {
        lobbyStore.selectedLobby = undefined;
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

/**
 * Calculates the maximum number of players for a given ally team configuration.
 * @param config The allyTeamConfig to use for this request
 * @returns The number of max players for the allyTeamConfig provided
 */
function getMaxPlayerCountFromAllyTeamConfig(config: Lobby["allyTeamConfig"]): number {
    let maxPlayerCount: number = 0;
    for (const allyTeam of Object.values(config)) {
        for (const team of Object.values(allyTeam.teams)) {
            maxPlayerCount += team.maxPlayers;
        }
    }
    return maxPlayerCount;
}

/**
 * Clears all user subscriptions associated with the lobby store.
 */
async function clearUserSubscriptions() {
    subsManager.clearAllFromList(lobbySymbol);
}

/**
 * Request to update the client status in the lobby with the provided data.
 * @param data Required data to fulfill this request
 */
async function requestUpdateClientStatus(data: LobbyUpdateClientStatusRequestData) {
    try {
        const response = await window.tachyon.request("lobby/updateClientStatus", data);
        console.log("Tachyon lobby/updateClientStatus:", response);
    } catch (error) {
        console.error("Error with request lobby/updateClientStatus", error);
        notificationsApi.alert({ text: "Error with request lobby/updateClientStatus", severity: "error" });
    }
}

/**
 * Request to join an active battle in the lobby as a spectator.
 */
async function requestJoinBattle() {
    try {
        const response = await window.tachyon.request("lobby/joinBattle");
        console.log("Tachyon lobby/joinBattle:", response);
    } catch (error) {
        console.error("Error with request lobby/joinBattle", error);
        notificationsApi.alert({ text: "Error with request lobby/joinBattle", severity: "error" });
    }
}

/**
 * Request to submit a vote in the lobby.
 * @param data Required data to fulfill this request
 */
async function requestVoteSubmit(data: LobbyVoteSubmitRequestData) {
    try {
        const response = await window.tachyon.request("lobby/voteSubmit", data);
        console.log("Tachyon lobby/voteSubmit:", response);
    } catch (error) {
        console.error("Error with request lobby/voteSubmit", error);
        notificationsApi.alert({ text: "Error with request lobby/voteSubmit", severity: "error" });
    }
}

/**
 * Request to appoint a user as the boss of the lobby.
 * @param userId The ID of the user to appoint as boss
 */
async function requestAppointBoss(userId: string) {
    try {
        const response = await window.tachyon.request("lobby/appointBoss", { userId });
        console.log("Tachyon lobby/appointBoss:", response);
    } catch (error) {
        console.error("Error with request lobby/appointBoss", error);
        notificationsApi.alert({ text: "Error with request lobby/appointBoss", severity: "error" });
    }
}

/**
 * Request to kick or ban a user from the lobby.
 * @param userId The ID of the user to kick or ban
 * @param until When the ban expires, in Unix timestamp format (optional)
 */
async function requestKickBan(userId: string, until?: number) {
    try {
        const response = await window.tachyon.request("lobby/kickban", { userId, banUntil: until });
        console.log("Tachyon lobby/kickban:", response);
    } catch (error) {
        console.error("Error with request lobby/kickban", error);
        notificationsApi.alert({ text: "Error with request lobby/kickban", severity: "error" });
    }
}

/**
 * Request to remove the boss status from a user in the lobby.
 * @param userId The ID of the user to remove as boss. If none is provided it will apply to the requesting user.
 */
async function requestUnboss(userId?: UserId) {
    try {
        const response = await window.tachyon.request("lobby/unboss", { userId });
        console.log("Tachyon lobby/unboss:", response);
    } catch (error) {
        console.error("Error with request lobby/unboss", error);
        notificationsApi.alert({ text: "Error with request lobby/unboss", severity: "error" });
    }
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
    requestUpdateClientStatus,
    requestJoinBattle,
    requestVoteSubmit,
    requestAppointBoss,
    requestKickBan,
    requestUnboss,
};
