// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { me, getAllUserSubscriptions } from "@renderer/store/me.store";
import {
    LobbyCreateOkResponseData,
    LobbyCreateRequestData,
    LobbyJoinOkResponseData,
    LobbyJoinRequestData,
    LobbyLeftEventData,
    LobbyListUpdatedEventData,
    LobbyUpdatedEventData,
    UserId,
    LobbyOverview,
    LobbyListResetEventData,
    LobbyAddBotRequestData,
    LobbyRemoveBotRequestData,
    LobbyUpdateBotRequestData,
} from "tachyon-protocol/types";
import { reactive } from "vue";
import { Lobby } from "@renderer/model/lobby";
import { apply as applyPatch } from "json8-merge-patch";
import { battleStore, battleActions } from "@renderer/store/battle.store";
import { db } from "@renderer/store/db";
import { notificationsApi } from "@renderer/api/notifications";
import { setupI18n } from "@renderer/i18n";

const i18n = setupI18n();

export const lobbyStore: {
    isInitialized: boolean;
    error?: string;
    lobbyList: Record<string, LobbyOverview>;
    selectedLobby: LobbyOverview | null;
    activeLobby?: Lobby | null;
} = reactive({
    isInitialized: false,
    error: undefined,
    lobbyList: {}, //This will hold changes from ``lobby/listUpdated`` events
    selectedLobby: null, //This is the lobby we select from the datatable showing the lobbylist
    activeLobby: null, //This will hold changes from ``lobby/updated`` events
});

//TODO: Switch this to subsManager once merged
async function subscribeList() {
    try {
        lobbyStore.error = undefined;
        const response = await window.tachyon.request("lobby/subscribeList");
        //Per Tachyon protocol, this subscribes us, but does not return an updated list, that happens in the ListUpdated or ListReset events.
        console.log("subscribeList:", response.status);
    } catch (error) {
        console.error("Error with request lobby/subscribeList:", error);
        notificationsApi.alert({
            text: "Error with request lobby/subscribeList",
            severity: "error",
        });
        lobbyStore.lobbyList = {};
    }
}
//TODO: Switch this to subsManager once merged
async function unsubscribeList() {
    try {
        lobbyStore.error = undefined;
        const response = await window.tachyon.request("lobby/unsubscribeList");
        console.log("Tachyon: lobby/unsubscribeList:", response.status);
    } catch (error) {
        console.error("Error with request lobby/unsubscribeList:", error);
        notificationsApi.alert({
            text: "Error with request lobby/unsubscribeList",
            severity: "error",
        });
    }
}

async function createLobby(data: LobbyCreateRequestData) {
    try {
        battleActions.resetToDefaultBattle(undefined, undefined, undefined, true);
        battleStore.isOnline = true;
        lobbyStore.error = undefined;
        const response = await window.tachyon.request("lobby/create", data);
        console.log("Tachyon: lobby/create:", response.status, response.data);
        lobbyStore.activeLobby = parseLobbyResponseData(response.data); //Set the active lobby data first...
        battleStore.isLobbyOpened = true;
        //Note, we don't do any 'user/subscribeUpdates' here because when we create it there is only ourselves on initial join.
        //If that ever changes, if a whole party joins instantly for example, then we need to revisit this.
    } catch (error) {
        console.error("Error with request lobby/create", error);
        notificationsApi.alert({
            text: "Error with request lobby/create",
            severity: "error",
        });
    }
}

async function joinLobby(id: LobbyJoinRequestData) {
    try {
        battleActions.resetToDefaultBattle(undefined, undefined, undefined, true);
        battleStore.isOnline = true;
        lobbyStore.error = undefined;
        const response = await window.tachyon.request("lobby/join", id);
        console.log("Tachyon: lobby/join:", response.status, response.data);
        lobbyStore.activeLobby = parseLobbyResponseData(response.data);
        battleStore.isLobbyOpened = true;
        //TODO: Switch this to subsManager once merged
        const userSubList: UserId[] = [];
        for (const memberKey in lobbyStore.activeLobby.players) {
            if (lobbyStore.activeLobby.players[memberKey]) {
                userSubList.push(lobbyStore.activeLobby.players[memberKey].id);
            }
        }
        for (const memberKey in lobbyStore.activeLobby.spectators) {
            if (lobbyStore.activeLobby.spectators[memberKey]) {
                userSubList.push(lobbyStore.activeLobby.spectators[memberKey].id);
            }
        }
        try {
            const response = await window.tachyon.request("user/subscribeUpdates", { userIds: userSubList });
            console.log("Tachyon joinLobby() requesting user/subscribeUpdates:", response);
        } catch (error) {
            console.error("Error with joinLobby() requesting user/subscribeUpdates:", error);
            notificationsApi.alert({
                text: "Error with request user/subscribeUpdates",
                severity: "error",
            });
        }
    } catch (error) {
        console.error("Error with request lobby/join", error);
        notificationsApi.alert({
            text: "Error with request lobby/join",
            severity: "error",
        });
    }
}

async function joinAllyTeam(allyTeam: string) {
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
async function joinQueue() {
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
async function spectate() {
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
function sortPlayerQueue(map: Map<number, string>): Map<number, string> {
    const mapEntries = Array.from(map.entries());
    mapEntries.sort((a, b) => {
        const keyA = a[0];
        const keyB = b[0];
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
    });
    return new Map(mapEntries);
}

// We use this function to normalize both LobbyCreateRequestData and LobbyJoinRequestData into the Lobby type for use in the renderer
function parseLobbyResponseData(data: LobbyCreateOkResponseData | LobbyJoinOkResponseData) {
    //Do some cleanup in case there's old data in the stores.
    battleStore.battleOptions.mapOptions.customStartBoxes = [];

    //Set up a basic object to hold the data
    const lobbyObject: Lobby = {
        id: data.id,
        name: data.name,
        playerCount: 0, //Placeholder value; We can count this from the entries below in the team config
        maxPlayerCount: 0, //Placeholder value; Ditto for calculating max players
        spectatorCount: 0,
        playerQueue: new Map(),
        botCount: 0,
        mapName: data.mapName,
        engineVersion: data.engineVersion,
        gameVersion: data.gameVersion,
        allyTeams: {},
        players: {},
        spectators: {},
        bots: {},
    };
    battleStore.battleOptions.engineVersion = data.engineVersion;
    battleStore.battleOptions.gameVersion = data.gameVersion;
    db.maps.get(data.mapName).then((map) => {
        if (map == undefined) {
            console.error(`Error in parseLobbyResponseData(), ${data.mapName} is undefined in database.`);
            notificationsApi.alert({ text: `Error in lobby data, ${data.mapName} not found.`, severity: "error" });
        }
        battleStore.battleOptions.map = map;
    });
    for (const allyKey in data.allyTeamConfig) {
        const allyTeam = data.allyTeamConfig[allyKey];
        lobbyObject.allyTeams![allyKey] = {
            startBox: allyTeam.startBox,
            maxTeams: allyTeam.maxTeams,
            teams: {},
        };
        for (const teamKey in allyTeam.teams) {
            const team = allyTeam.teams[teamKey];
            lobbyObject.allyTeams![allyKey].teams![teamKey] = { maxPlayers: team.maxPlayers };
            lobbyObject.maxPlayerCount += team.maxPlayers; //Lobby maximum is sum of all AllyTeams>Teams>MaxPlayers
        }
        //Here we assign the startbox for the AllyTeam to the battlestore so they match what we set when the lobby was created.
        battleStore.battleOptions.mapOptions.customStartBoxes.push(allyTeam.startBox);
    }
    // We have to loop through anyway, so playerCount, spectatorCount, and botCount will be calculated by incrementing.
    for (const memberKey in data.players) {
        const member = data.players[memberKey];
        lobbyObject.playerCount++;
        lobbyObject.players![memberKey] = {
            id: member.id,
            allyTeam: member.allyTeam,
            team: member.team,
            player: member.player,
        };
    }
    const tempMap: Map<number, string> = new Map();
    for (const memberKey in data.spectators) {
        const member = data.spectators[memberKey];
        lobbyObject.spectatorCount++;
        lobbyObject.spectators[memberKey] = {
            id: member.id,
        };
        if (member.joinQueuePosition != null) {
            tempMap.set(member.joinQueuePosition, member.id);
        }
    }
    lobbyObject.playerQueue = new Map(sortPlayerQueue(tempMap));
    for (const botKey in data.bots) {
        const bot = data.bots[botKey];
        lobbyObject.botCount++;
        lobbyObject.bots![botKey] = {
            id: bot.id,
            allyTeam: bot.allyTeam,
            team: bot.team,
            player: bot.player,
            name: bot.name ? bot.name : "Unknown",
            shortName: bot.shortName,
            version: bot.version ? bot.version : "",
            options: bot.options ? bot.options : {},
        };
    }
    return lobbyObject;
}

async function leaveLobby() {
    try {
        lobbyStore.error = undefined;
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
    battleStore.isLobbyOpened = false;
}

// This is a *request* for the battle to start, but 'battle/start' event received will actually trigger the client to launch the game.
async function requestStartBattle() {
    try {
        lobbyStore.error = undefined;
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
        const response = await window.tachyon.request("lobby/removeBot", data);
        console.log("Tachyon lobby/updateBot:", response);
    } catch (error) {
        console.error("Error with request lobby/updateBot", error);
        notificationsApi.alert({
            text: "Error with request lobby/updateBot",
            severity: "error",
        });
    }
}

function clearSelectedLobbyIfNull() {
    if (lobbyStore.selectedLobby && lobbyStore.selectedLobby.id && lobbyStore.lobbyList[lobbyStore.selectedLobby.id] == null) {
        lobbyStore.selectedLobby = null;
    }
}

function onListUpdatedEvent(data: LobbyListUpdatedEventData) {
    console.log("Tachyon event: lobby/listUpdated:", data);
    lobbyStore.lobbyList = applyPatch(lobbyStore.lobbyList, data.lobbies);
    clearSelectedLobbyIfNull();
}

function onLobbyListResetEvent(data: LobbyListResetEventData) {
    console.log("Tachyon event: lobby/listReset", data);
    lobbyStore.lobbyList = data.lobbies;
    clearSelectedLobbyIfNull();
}

async function onLobbyUpdatedEvent(data: LobbyUpdatedEventData) {
    console.log("Tachyon event: lobby/updated:", data);
    //Apply the patch
    lobbyStore.activeLobby = applyPatch(lobbyStore.activeLobby, data);
    if (!lobbyStore.activeLobby) return;
    //Recalculate player counts afterward.
    let maxPlayerCount: number = 0;
    for (const allyKey in lobbyStore.activeLobby.allyTeams) {
        for (const teamKey in lobbyStore.activeLobby.allyTeams[allyKey].teams) {
            maxPlayerCount += lobbyStore.activeLobby.allyTeams[allyKey].teams[teamKey].maxPlayers!;
        }
    }
    lobbyStore.activeLobby.maxPlayerCount = maxPlayerCount;
    const playerCount: number = Object.keys(lobbyStore.activeLobby.players).length;
    const spectatorCount: number = Object.keys(lobbyStore.activeLobby.spectators).length;
    const botCount: number = Object.keys(lobbyStore.activeLobby.bots).length;
    const tempMap: Map<number, string> = new Map();
    for (const memberKey in lobbyStore.activeLobby?.spectators) {
        const member = lobbyStore.activeLobby.spectators[memberKey];
        if (member.joinQueuePosition != null) {
            tempMap.set(member.joinQueuePosition, member.id);
        }
    }
    lobbyStore.activeLobby.playerQueue = new Map(sortPlayerQueue(tempMap));
    lobbyStore.activeLobby.playerCount = playerCount;
    lobbyStore.activeLobby.spectatorCount = spectatorCount;
    lobbyStore.activeLobby.botCount = botCount;
    const userSubList: UserId[] = [];
    const userUnsubList: UserId[] = [];
    const keepList = getAllUserSubscriptions();
    //TODO: Switch this to subsManager once merged
    if (data.players) {
        for (const memberKey in data.players) {
            const member = data.players[memberKey];
            if (member != null) {
                userSubList.push(member.id);
            } else if (!keepList.includes(memberKey)) {
                userUnsubList.push(memberKey);
            }
        }
    }
    if (data.spectators) {
        for (const memberKey in data.spectators) {
            const member = data.spectators[memberKey];
            if (member != null) {
                userSubList.push(member.id);
            } else if (!keepList.includes(memberKey)) {
                userUnsubList.push(memberKey);
            }
        }
    }
    if (userSubList.length > 0) {
        try {
            const response = await window.tachyon.request("user/subscribeUpdates", { userIds: userSubList });
            console.log("Tachyon onLobbyUpdatedEvent() user/subscribeUpdates:", response);
        } catch (error) {
            console.log("Tachyon error: onLobbyUpdatedEvent() user/subscribeUpdates:", error);
            notificationsApi.alert({
                text: "Tachyon error with user/subscribeUpdates",
                severity: "error",
            });
        }
    }
    if (userUnsubList.length > 0) {
        try {
            const response = await window.tachyon.request("user/unsubscribeUpdates", { userIds: userUnsubList });
            console.log("Tachyon onLobbyUpdatedEvent() user/unsubscribeUpdates:", response);
        } catch (error) {
            console.log("Tachyon error: onLobbyUpdatedEvent() user/unsubscribeUpdates:", error);
            notificationsApi.alert({
                text: "Tachyon error with user/unsubscribeUpdates",
                severity: "error",
            });
        }
    }
}

function onLobbyLeftEvent(data: LobbyLeftEventData) {
    clearUserSubscriptions();
    lobbyStore.activeLobby = undefined;
    console.log("Tachyon event: lobby/left:", data);
    // If we ever use a specific view for a lobby instead of BattleDrawer, we need to push a route here
    battleStore.isLobbyOpened = false;
    notificationsApi.alert({
        text: i18n.global.t("lobby.multiplayer.custom.removedFromLobby"),
        severity: "info",
    });
}

//TODO: Switch this to subsManager once merged
async function clearUserSubscriptions() {
    const userUnsubList: UserId[] = [];
    const keepList = getAllUserSubscriptions();
    if (lobbyStore.activeLobby?.players) {
        for (const memberKey in lobbyStore.activeLobby.players) {
            // Skip unsubbing from ourselves.
            if (lobbyStore.activeLobby.players[memberKey].id != me.userId) {
                // Skip any users that are subscribed from the me.store
                if (!keepList.includes(memberKey)) {
                    userUnsubList.push(lobbyStore.activeLobby.players[memberKey].id);
                }
            }
        }
    }
    if (lobbyStore.activeLobby?.spectators) {
        for (const memberKey in lobbyStore.activeLobby.spectators) {
            if (lobbyStore.activeLobby.spectators[memberKey].id != me.userId) {
                if (!keepList.includes(memberKey)) {
                    userUnsubList.push(lobbyStore.activeLobby.spectators[memberKey].id);
                }
            }
        }
    }
    if (userUnsubList.length > 0) {
        try {
            const response = await window.tachyon.request("user/unsubscribeUpdates", { userIds: userUnsubList });
            console.log("Tachyon clearUserSubscriptions() user/unsubscribeUpdates:", response);
        } catch (error) {
            console.log("Tachyon error: clearUserSubscriptions() user/unsubscribeUpdates:", error);
            notificationsApi.alert({
                text: "Tachyon error with user/unsubscribeUpdates",
                severity: "error",
            });
        }
    }
}

function clearLobbyAndListInfo() {
    lobbyStore.lobbyList = {};
    lobbyStore.selectedLobby = null;
    lobbyStore.activeLobby = undefined;
}

export async function initLobbyStore() {
    window.tachyon.onEvent("lobby/left", onLobbyLeftEvent);
    window.tachyon.onEvent("lobby/listUpdated", onListUpdatedEvent);
    window.tachyon.onEvent("lobby/updated", onLobbyUpdatedEvent);
    window.tachyon.onEvent("lobby/listReset", onLobbyListResetEvent);
    lobbyStore.isInitialized = true;
}

export const lobby = {
    createLobby,
    joinLobby,
    leaveLobby,
    requestStartBattle,
    subscribeList,
    unsubscribeList,
    clearLobbyAndListInfo,
    joinAllyTeam,
    joinQueue,
    spectate,
    requestAddBot,
    requestRemoveBot,
    requestUpdateBot,
};
