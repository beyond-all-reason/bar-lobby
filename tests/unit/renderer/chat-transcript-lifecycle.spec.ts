// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));

const handlers = new Map<string, (data: unknown) => void>();

Object.assign(window.tachyon, {
    requestStructured: vi.fn(),
    onConnected: vi.fn(),
    onDisconnected: vi.fn(),
    onEvent: (command: string, callback: (data: unknown) => void) => void handlers.set(command, callback),
});
Object.defineProperty(window, "auth", { value: { onChanged: vi.fn() }, writable: true });

const { chatStore, initChatStore } = await import("@renderer/store/chat.store");
const { lobby, lobbyStore, initLobbyStore } = await import("@renderer/store/lobby.store");
const { partyStore, initPartyStore } = await import("@renderer/store/party.store");
const { me } = await import("@renderer/store/me.store");

const emit = (command: string, data: unknown) => handlers.get(command)?.(data);

const lobbyPayload = (id: string) => ({ status: "success" as const, data: { id, players: {}, spectators: {}, bots: {} } });

const partyPayload = (id: string) => ({ id, members: [{ userId: me.userId }], invited: [] });

// Each transcript is keyed by its own lobby/party id, so entering or leaving one
// no longer has to clear anything: history for an id is simply there again if we
// come back to it, and untouched while we're elsewhere.
describe("chat transcript lifecycle", () => {
    beforeAll(async () => {
        me.userId = "1";
        await Promise.all([initChatStore(), initLobbyStore(), initPartyStore()]);
    });

    beforeEach(() => {
        chatStore.lobbyChats.clear();
        chatStore.lobbyChats.set("lobby-1", [{ message: "said in the last lobby" } as never]);
        chatStore.partyChats.clear();
        chatStore.partyChats.set("party-1", [{ message: "said in the last party" } as never]);
        lobbyStore.activeLobby = undefined;
        partyStore.parties.clear();
        partyStore.activeParty = undefined;
        vi.mocked(window.tachyon.requestStructured).mockReset();
    });

    describe("lobbies", () => {
        it("keeps another lobby's chat when joining a new one", async () => {
            vi.mocked(window.tachyon.requestStructured).mockResolvedValue(lobbyPayload("lobby-2") as never);

            await lobby.requestJoinLobby("lobby-2");

            expect(chatStore.lobbyChats.get("lobby-1")).toEqual([{ message: "said in the last lobby" }]);
        });

        it("keeps the chat on leaving", async () => {
            vi.mocked(window.tachyon.requestStructured).mockResolvedValue(lobbyPayload("lobby-2") as never);
            await lobby.requestJoinLobby("lobby-2");
            chatStore.lobbyChats.set("lobby-2", [{ message: "said in this lobby" } as never]);

            await lobby.requestLeaveLobby();

            expect(chatStore.lobbyChats.get("lobby-2")).toEqual([{ message: "said in this lobby" }]);
        });

        it("keeps the chat on being dropped from the lobby", async () => {
            vi.mocked(window.tachyon.requestStructured).mockResolvedValue(lobbyPayload("lobby-2") as never);
            await lobby.requestJoinLobby("lobby-2");
            chatStore.lobbyChats.set("lobby-2", [{ message: "said in this lobby" } as never]);

            emit("lobby/left", { id: "lobby-2" });

            expect(chatStore.lobbyChats.get("lobby-2")).toEqual([{ message: "said in this lobby" }]);
        });

        // A lobby/updated event arrives on any change to the lobby we are already
        // in, so treating one as an entry would wipe the chat constantly.
        it("leaves the chat alone on an update to the lobby it is already in", async () => {
            vi.mocked(window.tachyon.requestStructured).mockResolvedValue(lobbyPayload("lobby-2") as never);
            await lobby.requestJoinLobby("lobby-2");
            chatStore.lobbyChats.set("lobby-2", [{ message: "said in this lobby" } as never]);

            emit("lobby/updated", { ...lobbyPayload("lobby-2").data, name: "renamed" });

            expect(chatStore.lobbyChats.get("lobby-2")).toHaveLength(1);
        });
    });

    describe("parties", () => {
        it("keeps another party's chat when a new one becomes active", () => {
            emit("party/updated", partyPayload("party-2"));

            expect(chatStore.partyChats.get("party-1")).toEqual([{ message: "said in the last party" }]);
        });

        it("leaves the chat alone on an update to the party it is already in", () => {
            emit("party/updated", partyPayload("party-2"));
            chatStore.partyChats.set("party-2", [{ message: "said in this party" } as never]);

            emit("party/updated", partyPayload("party-2"));

            expect(chatStore.partyChats.get("party-2")).toHaveLength(1);
        });
    });
});
