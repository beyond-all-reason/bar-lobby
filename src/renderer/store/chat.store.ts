// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive } from "vue";
import { subsManager } from "@renderer/store/users.store";
import { MessagingReceivedEventData, MessagingSendRequestData, MessagingSubscribeReceivedRequestData, UserId } from "tachyon-protocol/types";
import { notificationsApi } from "@renderer/api/notifications";
import { Message } from "@renderer/model/message";
import { me } from "@renderer/store/me.store";
// import { setupI18n } from "@renderer/i18n";

// const i18n = setupI18n();

const chatSymbol = Symbol("chat.store");

export const chatStore: {
    isInitialized: boolean;
    lobbyChat: Message[];
    partyChat: Message[];
    userChats: Map<UserId, Message[]>;
} = reactive({
    isInitialized: false,
    lobbyChat: [],
    partyChat: [],
    userChats: new Map<UserId, Message[]>(), // Messages.vue will turn each of these Map elements into a TabPanel for the chat history with that user
});

export async function initChatStore() {
    window.tachyon.onEvent("messaging/received", onMessagingReceivedEvent);
    chatStore.isInitialized = true;
}

const chatDestinations = {
    lobby: chatStore.lobbyChat,
    party: chatStore.partyChat,
    player: chatStore.userChats,
};

/**
 * Send a Tachyon request to send a message (all types and destinations)
 * @param data Payload of the data required for this request via Tachyon
 */
async function requestSend(data: MessagingSendRequestData) {
    try {
        const response = await window.tachyon.request("messaging/send", data);
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
 * Send a Tachyon request to subscribe to incoming messages (all types and sources).
 * @param data Payload of the data required for this request via Tachyon
 */
async function requestSubscribeReceived(data?: MessagingSubscribeReceivedRequestData) {
    try {
        const response = await window.tachyon.request("messaging/subscribeReceived", data ?? {});
        console.log("Tachyon messaging/subscribeReceived:", response);
    } catch (error) {
        console.error("Error with messaging/subscribeReceived", error);
        notificationsApi.alert({ text: "Error with request messaging/subscribeReceived", severity: "error" });
    }
}

/**
 * Handles incoming message events from Tachyon
 * This should never be called directly outside of the store.
 * @param data Payload of the data from the event
 */
function onMessagingReceivedEvent(data: MessagingReceivedEventData) {
    console.log("Tachyon event: messaging/received:", data);
    subsManager.attach(data.source.userId, chatSymbol);
    insertMessage(data, data.source);
}

/**
 * Inserts a message into a chat history that this client sent, because the server will not provide it back to us as an event
 * @param requestData Payload of data already sent to the Tachyon server for this client's message request
 */
function insertSelfMessage(requestData: MessagingSendRequestData) {
    insertMessage(
        // data:
        {
            message: requestData.message,
            source: {
                type: requestData.target.type,
                userId: me.userId,
                lobbyId: "", // We are not preserving lobby/party chat based on an ID, so these are irrelevant and can be empty strings
                partyId: "",
            },
            timestamp: Date.now() * 1000,
            marker: "",
        },
        // destination:
        requestData.target
    );
}

/**
 * Inserts a message into a chat history
 * @param data Payload of message data
 * @param destination The targets chat that will store the message event
 */
function insertMessage(data: MessagingReceivedEventData, destination: MessagingSendRequestData["target"]) {
    const msg = { ...data, seen: false };
    if (destination.type === "player") {
        const userChat = chatDestinations["player"].get(destination.userId);
        if (!userChat) {
            chatDestinations["player"].set(destination.userId, [msg]);
        } else {
            userChat.push(msg);
        }
    } else {
        chatDestinations[destination.type].push(msg);
    }
}

/**
 * Deletes all stored history in chatStore.lobbyChat
 */
function clearLobbyChat() {
    chatStore.lobbyChat.length = 0;
}

/**
 * Deletes all stored history in chatStore.partyChat
 */
function clearPartyChat() {
    chatStore.partyChat.length = 0;
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

export const chat = {
    requestSend,
    requestSubscribeReceived,
    clearLobbyChat,
    clearPartyChat,
    clearUserChat,
    addNewUserChat,
};
