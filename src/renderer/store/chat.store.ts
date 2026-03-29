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

function requestSend(data: MessagingSendRequestData) {
    try {
        const response = window.tachyon.request("messaging/send", data);
        console.log("Tachyon messaging/send:", response);
        // Upon success, we add our own message to the history because we do not get it from the server.
        if (data.target.type === "player") {
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
    insertMessage(data);
}

function insertSelfMessage(source: MessagingReceivedEventData["source"], message: string) {
    const data: MessagingReceivedEventData = {
        message: message,
        source: source,
        timestamp: Date.now() * 1000,
        marker: "",
    };
    insertMessage(data, true);
}

function insertMessage(data: MessagingReceivedEventData, self?: boolean) {
    // Note, we don't need to attach for sources "lobby" or "party" because those stores will manage
    // their own attach/detach decisions.
    const targetUser: UserId = data.source.userId;
    if (self) {
        data.source.userId = me.userId;
    }
    if (data.source.type === "player") {
        subsManager.attach(targetUser, chatSymbol);
        if (chatStore.userChats.get(targetUser)) {
            chatStore.userChats.get(targetUser)!.push({ ...data, seen: false });
        } else {
            chatStore.userChats.set(targetUser, [{ ...data, seen: false }]);
        }
    }
    if (data.source.type === "lobby") {
        chatStore.lobbyChat.push({ ...data, seen: false });
    }
    if (data.source.type === "party") {
        chatStore.partyChat.push({ ...data, seen: false });
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
}

export const chat = {
    requestSend,
    requestSubscribeReceived,
    clearLobbyChat,
    clearPartyChat,
    clearUserChat,
};
