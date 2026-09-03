// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive } from "vue";
import { subsManager } from "@renderer/store/users.store";
import { HistoryMarker, MessagingReceivedEventData, MessagingSendRequestData, MessagingSubscribeReceivedRequestData, UserId, PartyId, LobbyId } from "tachyon-protocol/types";
import { notificationsApi } from "@renderer/api/notifications";
import { tachyonRequest } from "@renderer/api/tachyon";
import { Message } from "@renderer/model/message";
import { me } from "@renderer/store/me.store";
import { onWentOffline } from "@renderer/utils/offline-signal";
import { onTachyonConnected } from "@renderer/utils/connection-signal";
import { lobbyStore } from "@renderer/store/lobby.store";
import { partyStore } from "@renderer/store/party.store";
// import { setupI18n } from "@renderer/i18n";

// const i18n = setupI18n();

const chatSymbol = Symbol("chat.store");

const SUBSCRIBE_RETRY_DELAY = 5000;
const SUBSCRIBE_ATTEMPT_LIMIT = 5;

let subscribeRetryTimer: ReturnType<typeof setTimeout> | undefined;
let subscribeAttempts = 0;

export const chatStore: {
    isInitialized: boolean;
    lastMarker: HistoryMarker | null;
    lobbyChats: Map<LobbyId, Message[]>;
    partyChats: Map<PartyId, Message[]>;
    userChats: Map<UserId, Message[]>;
} = reactive({
    isInitialized: false,
    lastMarker: null,
    lobbyChats: new Map<LobbyId, Message[]>(),
    partyChats: new Map<PartyId, Message[]>(),
    userChats: new Map<UserId, Message[]>(),
});

export async function initChatStore() {
    if (chatStore.isInitialized) {
        console.warn("Chat store is already initialized. Skipping initialization.");
        return;
    }
    onWentOffline.add(clearOnlineState);
    // Losing the session is the one signal every way of leaving an account reaches:
    // the exit menu, a server switch, and a refresh token the server rejects.
    window.auth.onChanged(({ authenticated }) => {
        if (!authenticated) clearAccountState();
    });
    window.tachyon.onEvent("messaging/received", onMessagingReceivedEvent);
    // Subscribe to messages (all sources) once connected.
    onTachyonConnected.add(() => requestSubscribeReceived());
    chatStore.isInitialized = true;
}

const chatDestinations = {
    lobby: chatStore.lobbyChats,
    party: chatStore.partyChats,
    player: chatStore.userChats,
};

/**
 * Send a Tachyon request to send a message (all types and destinations)
 * @param data Payload of the data required for this request via Tachyon
 */
async function requestSend(data: MessagingSendRequestData) {
    try {
        const response = await tachyonRequest("messaging/send", data);
        console.log("Tachyon messaging/send:", response);
        if (data.target.type === "player") {
            if (data.target.userId !== me.userId) {
                // We attach for DMs only, because lobby/party will handle their own.
                subsManager.attach(data.target.userId, chatSymbol);
            } else {
                return; // Message is to our own userId, so we don't bother w/ a self message b/c we will receive it from the server.
            }
        }
        insertSelfMessage(data);
    } catch (error) {
        console.error("Error with messaging/send", error);
        notificationsApi.alert({ text: "Error with request messaging/send", severity: "error" });
    }
}

/**
 * Works out where the server should resume our message history from.
 * @returns The `since` value to subscribe with
 */
function resumePoint(): MessagingSubscribeReceivedRequestData["since"] {
    if (chatStore.lastMarker) {
        return { type: "marker", value: chatStore.lastMarker };
    }

    // Without a marker there is nothing to line our history up against, so asking
    // for the whole buffer would repeat anything we already hold.
    return hasStoredMessages() ? { type: "latest" } : { type: "from_start" };
}

function hasStoredMessages(): boolean {
    return chatStore.lobbyChats.size > 0 || chatStore.partyChats.size > 0 || [...chatStore.userChats.values()].some((chat) => chat.length > 0);
}

/**
 * Send a Tachyon request to subscribe to incoming messages (all types and sources).
 * @param data Payload of the data required for this request via Tachyon
 */
async function requestSubscribeReceived(data?: MessagingSubscribeReceivedRequestData) {
    subscribeAttempts = 0;

    return subscribeReceived(data);
}

async function subscribeReceived(data?: MessagingSubscribeReceivedRequestData) {
    cancelSubscribeRetry();
    subscribeAttempts++;

    const request = data ?? { since: resumePoint() };

    try {
        const response = await tachyonRequest("messaging/subscribeReceived", request);
        console.log("Tachyon messaging/subscribeReceived:", response);
        subscribeAttempts = 0;

        // Only a marker we thought was live says anything here. The server also
        // reports a gap for from_start, where the flag stays set for the rest of
        // the session once its buffer has overflowed even once.
        if (response.data.hasMissedMessages && request.since?.type === "marker") {
            console.warn("Tachyon messaging/subscribeReceived: could not resume from our marker, chat history has a gap");
        }
    } catch (error) {
        console.error("Error with messaging/subscribeReceived", error);
        scheduleSubscribeRetry(data);
    }
}

// A subscription that fails leaves us connected and receiving nothing, with
// nothing to try again until the socket happens to drop. The server keeps
// buffering either way, so a later attempt still picks up what was missed.
function scheduleSubscribeRetry(data?: MessagingSubscribeReceivedRequestData) {
    if (subscribeAttempts >= SUBSCRIBE_ATTEMPT_LIMIT) {
        notificationsApi.alert({ text: "Error with request messaging/subscribeReceived", severity: "error" });
        return;
    }

    subscribeRetryTimer = setTimeout(() => void subscribeReceived(data), SUBSCRIBE_RETRY_DELAY);
}

function cancelSubscribeRetry() {
    if (subscribeRetryTimer === undefined) return;

    clearTimeout(subscribeRetryTimer);
    subscribeRetryTimer = undefined;
}

/**
 * Handles incoming message events from Tachyon
 * This should never be called directly outside of the store.
 * @param data Payload of the data from the event
 */
function onMessagingReceivedEvent(data: MessagingReceivedEventData) {
    console.log("Tachyon event: messaging/received:", data);
    // The server holds one buffer for every source and replays it in order, so
    // the marker on the message we just got is always the latest one we have.
    chatStore.lastMarker = data.marker;
    subsManager.attach(data.source.userId, chatSymbol);
    insertMessage(data, data.source);
}

/**
 * Inserts a message into a chat history that this client sent, because the server will not provide it back to us as an event
 * @param requestData Payload of data already sent to the Tachyon server for this client's message request
 */
function insertSelfMessage(requestData: MessagingSendRequestData) {
    if (requestData.target.type === "player") {
        insertMessage({ ...requestData, source: { type: "player", userId: me.userId }, timestamp: Date.now() * 1000, marker: "" }, requestData.target);
    }
    if (requestData.target.type === "lobby") {
        insertMessage(
            { ...requestData, source: { type: "lobby", lobbyId: lobbyStore.activeLobby?.id ?? "", userId: me.userId }, timestamp: Date.now() * 1000, marker: "" },
            { type: "lobby", lobbyId: lobbyStore.activeLobby?.id ?? "", userId: me.userId }
        );
    }
    if (requestData.target.type === "party") {
        insertMessage(
            { ...requestData, source: { type: "party", partyId: partyStore.activeParty ?? "", userId: me.userId }, timestamp: Date.now() * 1000, marker: "" },
            { type: "party", partyId: partyStore.activeParty ?? "", userId: me.userId }
        );
    }
}

/**
 * Inserts a message into a chat history
 * @param data Payload of message data
 * @param destination The targets chat that will store the message event
 */
function insertMessage(data: MessagingReceivedEventData, destination: MessagingReceivedEventData["source"]) {
    const msg = { ...data, seen: false };
    const destId = destination.type === "lobby" ? destination.lobbyId : destination.type === "party" ? destination.partyId : destination.userId;
    // if (destination.type === "player") {
    const chat = chatDestinations[destination.type].get(destId);
    if (!chat) {
        chatDestinations[destination.type].set(destId, [msg]);
    } else {
        chat.push(msg);
    }
    // }
    // if (destination.type === "lobby") {
    //     const lobbyChat = chatDestinations[destination.type].get(dId);
    //     if (!lobbyChat) {
    //         chatDestinations[destination.type].set(dId, [msg]);
    //     } else {
    //         lobbyChat.push(msg);
    //     }
    // }
    // if (destination.type === "party") {
    //     const partyChat = chatDestinations[destination.type].get(dId);
    //     if (!partyChat) {
    //         chatDestinations[destination.type].set(dId, [msg]);
    //     } else {
    //         partyChat.push(msg);
    //     }
    // }
}

/**
 * Deletes all stored history in chatStore.lobbyChats
 */
function clearLobbyChat() {
    chatStore.lobbyChats.clear();
}

/**
 * Deletes all stored history in chatStore.partyChats
 */
function clearPartyChat() {
    chatStore.partyChats.clear();
}

/**
 * Deletes all stored history in chatStore.userChats
 */
function clearAllUserChats() {
    chatStore.userChats.clear();
}

/**
 * Deletes all stored history of a specific user by removing it entirely from the chatStore.userChats Map.
 * Also removes the user from the chat store subscriptions
 * @param userId ID of user to be deleted
 */
function clearUserChat(userId: UserId) {
    chatStore.userChats.delete(userId);
    subsManager.detach(userId, chatSymbol);
}

/** Creates an empty chat history for the identified user ID, if one does not exist yet.
 * @param {UserId} userId ID of user to create a history for
 * @returns {boolean} If a new chat was needed returns true; otherwise false.
 **/
function addNewUserChat(userId: UserId): boolean {
    if (!chatDestinations["player"].get(userId)) {
        chatDestinations["player"].set(userId, []);
        return true;
    } else return false;
}

// Chat is a transcript of what was said rather than state the server owns, and
// going offline ends the session holding the only other copy, so none of it can
// be fetched again. The lobby and party transcripts are cleared on entering the
// next one instead.
function clearOnlineState() {
    cancelSubscribeRetry();
    // system/disconnect stops the session and takes its message buffer with it,
    // leaving the marker pointing at nothing.
    chatStore.lastMarker = null;
}

// Everything here belongs to the account that sent and received it, so none of it
// may be left for whoever signs in next.
function clearAccountState() {
    subsManager.clearAllFromList(chatSymbol);
    clearAllUserChats();
    clearLobbyChat();
    clearPartyChat();
}

export const chat = {
    requestSend,
    requestSubscribeReceived,
    clearLobbyChat,
    clearPartyChat,
    clearUserChat,
    clearAllUserChats,
    addNewUserChat,
    clearOnlineState,
    clearAccountState,
};
