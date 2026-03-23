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
        // Upon success, we add our own message to the body if it's a "player" type
        if (data.target.type === "player") {
            insertSelfMessage(data.target.userId, data.message);
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
    // Note, we don't need to attach for sources "lobby" or "party" because those stores will manage
    // their own attach/detach decisions.
    if (data.source.type === "player") {
        subsManager.attach(data.source.userId, chatSymbol);
        if (chatStore.userChats.get(data.source.userId)) {
            chatStore.userChats.get(data.source.userId)!.push({ ...data, seen: false, isMe: false });
        } else {
            chatStore.userChats.set(data.source.userId, [{ ...data, seen: false, isMe: false }]);
        }
    }
    if (data.source.type === "lobby") {
        chatStore.lobbyChat.push({ ...data, seen: false, isMe: false });
    }
    if (data.source.type === "party") {
        chatStore.partyChat.push({ ...data, seen: false, isMe: false });
    }
}

export function insertSelfMessage(targetUserId: UserId, message: string) {
    subsManager.attach(targetUserId, chatSymbol);
    const data: MessagingReceivedEventData = {
        message: message,
        source: { type: "player", userId: me.userId },
        timestamp: Date.now(),
        marker: "",
    };
    if (chatStore.userChats.get(targetUserId)) {
        chatStore.userChats.get(targetUserId)!.push({
            ...data,
            seen: false,
            isMe: true,
        });
    } else {
        chatStore.userChats.set(targetUserId, [
            {
                ...data,
                seen: false,
                isMe: true,
            },
        ]);
    }
}
// We want to start with an empty chat array if we join a new lobby/party chat,
// so we give the UI a simple way to purge the old data just before joining.
export function clearLobbyChat() {
    chatStore.lobbyChat.length = 0;
}

export function clearPartyChat() {
    chatStore.partyChat.length = 0;
}

export const chat = {
    requestSend,
    requestSubscribeReceived,
    clearLobbyChat,
    clearPartyChat,
    insertSelfMessage,
};
