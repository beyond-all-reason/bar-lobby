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
    userChats: new Map<UserId, Message[]>(),
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

async function requestSubscribeReceived(data?: MessagingSubscribeReceivedRequestData) {
    try {
        const response = await window.tachyon.request("messaging/subscribeReceived", data ?? {});
        console.log("Tachyon messaging/subscribeReceived:", response);
    } catch (error) {
        console.error("Error with messaging/subscribeReceived", error);
        notificationsApi.alert({ text: "Error with request messaging/subscribeReceived", severity: "error" });
    }
}

function onMessagingReceivedEvent(data: MessagingReceivedEventData) {
    console.log("Tachyon event: messaging/received:", data);
    subsManager.attach(data.source.userId, chatSymbol);
    insertMessage(data, data.source.type === "player" ? data.source.userId : chatDestinations[data.source.type]);
}

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
        requestData.target.type === "player" ? requestData.target.userId : chatDestinations[requestData.target.type]
    );
}

function insertMessage(data: MessagingReceivedEventData, destination: UserId | Message[]) {
    if (typeof destination == "string") {
        const userChat = chatDestinations["player"].get(destination);
        if (!userChat) {
            chatDestinations["player"].set(destination, [{ ...data, seen: false }]);
        } else {
            userChat.push({ ...data, seen: false });
        }
    } else {
        destination.push({ ...data, seen: false });
    }
}

// We want to start with an empty chat array if we join a new lobby/party chat,
// so we give the UI a simple way to purge the old data just before joining.
function clearLobbyChat() {
    chatStore.lobbyChat.length = 0;
}

function clearPartyChat() {
    chatStore.partyChat.length = 0;
}

function clearUserChat(userId: UserId) {
    chatStore.userChats.delete(userId);
    subsManager.detach(userId, chatSymbol);
}

export const chat = {
    requestSend,
    requestSubscribeReceived,
    clearLobbyChat,
    clearPartyChat,
    clearUserChat,
};
