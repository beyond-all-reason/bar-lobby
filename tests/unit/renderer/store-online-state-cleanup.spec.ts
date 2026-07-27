// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));

const disconnectHandlers: Array<() => void> = [];
const connectHandlers: Array<() => void> = [];

const onDisconnected = vi.fn((callback: () => void) => void disconnectHandlers.push(callback));
const onConnected = vi.fn((callback: () => void) => void connectHandlers.push(callback));

window.tachyon.onDisconnected = onDisconnected as unknown as typeof window.tachyon.onDisconnected;
window.tachyon.onConnected = onConnected as unknown as typeof window.tachyon.onConnected;

const { matchmakingStore, MatchmakingStatus, initializeMatchmakingStore } = await import("@renderer/store/matchmaking.store");
const { partyStore, party, PlayersPartyState, initPartyStore } = await import("@renderer/store/party.store");
const { lobbyStore, initLobbyStore } = await import("@renderer/store/lobby.store");
const { chatStore, initChatStore } = await import("@renderer/store/chat.store");

const STORES_REGISTERING_CLEANUP = 4;

function simulateDisconnect() {
    disconnectHandlers.forEach((handler) => handler());
}

describe("online state cleanup on disconnect", () => {
    beforeAll(async () => {
        await Promise.all([initPartyStore(), initLobbyStore(), initializeMatchmakingStore(), initChatStore()]);
    });

    it("registers a disconnect handler from every store that owns online state", () => {
        expect(onDisconnected).toHaveBeenCalledTimes(STORES_REGISTERING_CLEANUP);
        expect(disconnectHandlers).toHaveLength(STORES_REGISTERING_CLEANUP);
    });

    it("drops matchmaking state the server owns but keeps the user's queue pick", () => {
        matchmakingStore.status = MatchmakingStatus.MatchFound;
        matchmakingStore.playlists = [{ id: "1v1", name: "Duel", version: "3" }] as typeof matchmakingStore.playlists;
        matchmakingStore.playersQueued = 12;
        matchmakingStore.selectedQueue = "2v2";

        simulateDisconnect();

        expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
        expect(matchmakingStore.playlists).toEqual([]);
        expect(matchmakingStore.playersQueued).toBe(0);
        expect(matchmakingStore.selectedQueue).toBe("2v2");
    });

    // Views index downloadsRequired by queue id, so emptying it crashed the matchmaking page.
    it("keeps the derived download requirements the views index into", () => {
        matchmakingStore.downloadsRequired = { "2v2": { engines: [], games: [], maps: ["somemap"] } };
        matchmakingStore.selectedQueue = "2v2";

        simulateDisconnect();

        expect(matchmakingStore.downloadsRequired["2v2"]).toEqual({ engines: [], games: [], maps: ["somemap"] });
    });

    it("drops party state without asking the dead socket to leave", () => {
        const requestLeave = vi.spyOn(party, "requestLeave");
        partyStore.activeParty = "party-1";
        partyStore.state = PlayersPartyState.JoinedOnly;
        partyStore.parties.set("party-1", { id: "party-1", members: [], invited: [], seen: true } as never);

        simulateDisconnect();

        expect(partyStore.activeParty).toBeUndefined();
        expect(partyStore.parties.size).toBe(0);
        expect(partyStore.state).toBe(PlayersPartyState.None);
        expect(requestLeave).not.toHaveBeenCalled();
    });

    it("drops lobby state but remembers that the list was wanted", () => {
        lobbyStore.lobbies = { "lobby-1": { id: "lobby-1" } as never };
        lobbyStore.selectedLobby = { id: "lobby-1" } as never;
        lobbyStore.activeLobby = { id: "lobby-1" } as never;
        lobbyStore.wantsListSubscription = true;

        simulateDisconnect();

        expect(lobbyStore.lobbies).toEqual({});
        expect(lobbyStore.selectedLobby).toBeUndefined();
        expect(lobbyStore.activeLobby).toBeUndefined();
        expect(lobbyStore.wantsListSubscription).toBe(true);
    });

    it("drops lobby and party chat but keeps direct messages", () => {
        chatStore.lobbyChat.push({ userId: "1", text: "in lobby" } as never);
        chatStore.partyChat.push({ userId: "1", text: "in party" } as never);
        chatStore.userChats.set("1", [{ userId: "1", text: "dm" } as never]);

        simulateDisconnect();

        expect(chatStore.lobbyChat).toEqual([]);
        expect(chatStore.partyChat).toEqual([]);
        expect(chatStore.userChats.get("1")).toHaveLength(1);
    });

    it("survives a disconnect with nothing to clean up", () => {
        expect(() => simulateDisconnect()).not.toThrow();
        expect(() => simulateDisconnect()).not.toThrow();
    });
});
