// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));

const handlers = new Map<string, (data: unknown) => void>();

Object.assign(window.tachyon, {
    request: vi.fn(),
    onConnected: vi.fn(),
    onDisconnected: vi.fn(),
    onEvent: (command: string, callback: (data: unknown) => void) => void handlers.set(command, callback),
});

const { chatStore, initChatStore } = await import("@renderer/store/chat.store");
const { lobby, lobbyStore, initLobbyStore } = await import("@renderer/store/lobby.store");
const { partyStore, initPartyStore } = await import("@renderer/store/party.store");
const { me } = await import("@renderer/store/me.store");

const emit = (command: string, data: unknown) => handlers.get(command)?.(data);

const lobbyPayload = (id: string) => ({ id, players: {}, spectators: {}, bots: {} });

const partyPayload = (id: string) => ({ id, members: [{ userId: me.userId }], invited: [] });

// Neither transcript is held per lobby or party, so entering the next one is what
// has to clear it. Going offline no longer does, because the server session
// holding the only other copy ends with it.
describe("chat transcript lifecycle", () => {
    beforeAll(async () => {
        me.userId = "1";
        await Promise.all([initChatStore(), initLobbyStore(), initPartyStore()]);
    });

    beforeEach(() => {
        chatStore.lobbyChat.splice(0, chatStore.lobbyChat.length, { message: "said in the last lobby" } as never);
        chatStore.partyChat.splice(0, chatStore.partyChat.length, { message: "said in the last party" } as never);
        lobbyStore.activeLobby = undefined;
        partyStore.parties.clear();
        partyStore.activeParty = undefined;
        vi.mocked(window.tachyon.request).mockReset();
    });

    describe("lobbies", () => {
        it("clears the previous lobby's chat on joining another", async () => {
            vi.mocked(window.tachyon.request).mockResolvedValue({ data: lobbyPayload("lobby-2") } as never);

            await lobby.requestJoinLobby("lobby-2");

            expect(chatStore.lobbyChat).toEqual([]);
        });

        // A lobby/updated event arrives on any change to the lobby we are already
        // in, so treating one as an entry would wipe the chat constantly.
        it("leaves the chat alone on an update to the lobby it is already in", async () => {
            vi.mocked(window.tachyon.request).mockResolvedValue({ data: lobbyPayload("lobby-2") } as never);
            await lobby.requestJoinLobby("lobby-2");
            chatStore.lobbyChat.push({ message: "said in this lobby" } as never);

            emit("lobby/updated", { ...lobbyPayload("lobby-2"), name: "renamed" });

            expect(chatStore.lobbyChat).toHaveLength(1);
        });
    });

    describe("parties", () => {
        it("clears the previous party's chat on joining another", () => {
            emit("party/updated", partyPayload("party-2"));

            expect(chatStore.partyChat).toEqual([]);
        });

        it("leaves the chat alone on an update to the party it is already in", () => {
            emit("party/updated", partyPayload("party-2"));
            chatStore.partyChat.push({ message: "said in this party" } as never);

            emit("party/updated", partyPayload("party-2"));

            expect(chatStore.partyChat).toHaveLength(1);
        });
    });
});
