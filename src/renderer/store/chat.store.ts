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

function requestSend(data: MessagingSendRequestData) {
    try {
        const response = window.tachyon.request("messaging/send", data);
        console.log("Tachyon messaging/send:", response);
        // We add our own message to the history because we do not get it from the server, unless it is targeted at ourselves.
        if (data.target.type === "player" && data.target.userId !== me.userId) {
            // We attach for DMs only, because lobby/party will handle their own.
            subsManager.attach(data.target.userId, chatSymbol);
            insertSelfMessage({ type: "player", userId: data.target.userId }, data.message);
        }
        if (data.target.type === "party") {
            insertSelfMessage({ type: "party", partyId: "", userId: me.userId }, data.message);
        }
        if (data.target.type === "lobby") {
            insertSelfMessage({ type: "lobby", lobbyId: "", userId: me.userId }, data.message);
        }
    } catch (error) {
        console.error("Error with messaging/send", error);
        notificationsApi.alert({ text: "Error with request messaging/send", severity: "error" });
    }
}

function requestSubscribeReceived(data?: MessagingSubscribeReceivedRequestData) {
    try {
        const response = window.tachyon.request("messaging/subscribeReceived", data ?? {});
        console.log("Tachyon messaging/subscribeReceived:", response);
    } catch (error) {
        console.error("Error with messaging/subscribeReceived", error);
        notificationsApi.alert({ text: "Error with request messaging/subscribeReceived", severity: "error" });
    }
}

function onMessagingReceivedEvent(data: MessagingReceivedEventData) {
    console.log("Tachyon event: messaging/received:", data);
    subsManager.attach(data.source.userId, chatSymbol);
    if (data.source.type === "player") {
        setupMessageArray(data.source.userId);
        insertMessage(data, chatDestinations["player"].get(data.source.userId)!);
    } else {
        insertMessage(data, chatDestinations[data.source.type]);
    }
}

function insertSelfMessage(source: MessagingReceivedEventData["source"], message: string) {
    const targetUser: string = source.userId;
    const data: MessagingReceivedEventData = {
        message: message,
        source: source,
        timestamp: Date.now() * 1000,
        marker: "",
    };
    if (source.type === "player") {
        source.userId = me.userId;
        setupMessageArray(targetUser);
        insertMessage(data, chatDestinations["player"].get(targetUser)!);
    } else {
        insertMessage(data, chatDestinations[source.type]);
    }
}

function insertMessage(data: MessagingReceivedEventData, destination: Message[]) {
    destination.push({ ...data, seen: false });
}

function setupMessageArray(userId: UserId) {
    if (!chatDestinations["player"].get(userId)) {
        chatDestinations["player"].set(userId, []);
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
