// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));

const authHandlers: Array<(state: { authenticated: boolean }) => void> = [];

const receivedHandlers: Array<(data: unknown) => void> = [];

Object.assign(window.tachyon, {
    request: vi.fn(),
    onEvent: (command: string, callback: (data: unknown) => void) => {
        if (command === "messaging/received") receivedHandlers.push(callback);
    },
});
Object.defineProperty(window, "auth", {
    value: { onChanged: (callback: (state: { authenticated: boolean }) => void) => void authHandlers.push(callback) },
    writable: true,
});

const { chatStore, initChatStore } = await import("@renderer/store/chat.store");
const { subsManager } = await import("@renderer/store/users.store");

const signOut = () => authHandlers.forEach((handler) => handler({ authenticated: false }));

const receiveFrom = (userId: string) => receivedHandlers.forEach((handler) => handler({ message: "hi", source: { type: "player", userId }, timestamp: 1_700_000_000_000_000, marker: "-1" }));

// Chat was only ever cleared on going offline, and that deliberately kept DM
// history, so signing out left it for whoever signed in next.
describe("chat across an account change", () => {
    beforeAll(async () => {
        await initChatStore();
    });

    beforeEach(() => {
        chatStore.userChats.clear();
        chatStore.userChats.set("42", [{ message: "theirs" } as never]);
        chatStore.lobbyChat.splice(0, chatStore.lobbyChat.length, { message: "in lobby" } as never);
        chatStore.partyChat.splice(0, chatStore.partyChat.length, { message: "in party" } as never);
    });

    it("drops direct message history when the account signs out", () => {
        signOut();

        expect(chatStore.userChats.size).toBe(0);
    });

    it("drops the lobby and party transcripts too", () => {
        signOut();

        expect(chatStore.lobbyChat).toEqual([]);
        expect(chatStore.partyChat).toEqual([]);
    });

    // Left attached, the next account keeps a subscription to someone it never spoke to.
    it("releases the user subscriptions the chats held", () => {
        receiveFrom("77");
        expect(subsManager.getAllUsersSubscribed()).toContain("77");

        signOut();

        expect(subsManager.getAllUsersSubscribed()).not.toContain("77");
    });

    it("leaves subscriptions another store is holding", () => {
        receiveFrom("88");
        subsManager.attach("88", Symbol("somewhere else"));

        signOut();

        expect(subsManager.getAllUsersSubscribed()).toContain("88");
    });

    it("leaves chat alone while still signed in", () => {
        authHandlers.forEach((handler) => handler({ authenticated: true }));

        expect(chatStore.userChats.size).toBe(1);
        expect(chatStore.lobbyChat).toHaveLength(1);
    });
});
