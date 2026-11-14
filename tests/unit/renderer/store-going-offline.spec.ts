// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/api/game", () => ({ gameApi: { onClosed: vi.fn() } }));

const disconnectHandlers: Array<() => void> = [];
const connectHandlers: Array<() => void> = [];

Object.assign(window.tachyon, {
    isConnected: vi.fn(async () => false),
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    dropConnection: vi.fn(async () => {}),
    requestStructured: vi.fn(async () => ({ status: "success", data: {} })),
    onBattleStart: vi.fn(),
    onEvent: vi.fn(),
    onDisconnected: (callback: () => void) => void disconnectHandlers.push(callback),
    onConnected: (callback: () => void) => void connectHandlers.push(callback),
});

Object.defineProperty(window, "auth", { value: { onChanged: vi.fn() }, writable: true });

const { matchmakingStore, matchmakingActions, MatchmakingStatus } = await import("@renderer/store/matchmaking.store");
const { initMatchmakingLogic } = await import("@renderer/logic/matchmaking");
const { partyStore, partyActions, PlayersPartyState } = await import("@renderer/store/party.store");
const { initPartyLogic } = await import("@renderer/logic/party");
const { lobbyStore, initLobbyStore } = await import("@renderer/store/lobby.store");
const { chatStore, initChatStore } = await import("@renderer/store/chat.store");
const { tachyonStore, initTachyonStore } = await import("@renderer/store/tachyon.store");
const { connectionStore, connectionActions } = await import("@renderer/store/connection.store");
const { connectionLogic, initConnectionLogic } = await import("@renderer/logic/connection");
const { onWentOffline } = await import("@renderer/utils/offline-signal");

const simulateClose = () => disconnectHandlers.forEach((handler) => handler());

function populateOnlineState() {
    matchmakingActions.set({
        status: MatchmakingStatus.Searching,
        playlists: [{ id: "1v1", name: "Duel", version: "3" }] as never,
        playersQueued: 12,
        selectedQueue: "2v2",
    });
    matchmakingActions.setDownloadsRequired("2v2", { engines: [], games: [], maps: ["somemap"] });

    partyActions.set({ id: "party-1", members: [{ userId: "1", joinedAt: 0 }], maxMembers: 4, invited: [] }, "1");

    lobbyStore.lobbies = { "lobby-1": { id: "lobby-1" } as never };
    lobbyStore.activeLobby = { id: "lobby-1" } as never;
    lobbyStore.wantsListSubscription = true;

    chatStore.lobbyChats.set("lobby-1", [{ userId: "1", text: "in lobby" } as never]);
    chatStore.partyChats.set("party-1", [{ userId: "1", text: "in party" } as never]);
    chatStore.userChats.set("1", [{ userId: "1", text: "dm" } as never]);
}

describe("going offline", () => {
    beforeAll(async () => {
        await Promise.all([initPartyLogic(), initLobbyStore(), initMatchmakingLogic(), initChatStore(), initConnectionLogic(), initTachyonStore()]);
    });

    beforeEach(() => {
        populateOnlineState();
        connectionActions.set({ isConnected: true, wantsConnection: true });
        vi.mocked(window.tachyon.dropConnection).mockClear();
    });

    // A vanished network sends no close frame, so the socket looks alive until the
    // silence timer gives up on it half a minute later.
    describe("when the network goes away", () => {
        it("drops the socket instead of waiting for the silence timer", () => {
            window.dispatchEvent(new Event("offline"));

            expect(window.tachyon.dropConnection).toHaveBeenCalledOnce();
        });

        it("leaves a connection that is already down alone", () => {
            connectionActions.set({ isConnected: false });

            window.dispatchEvent(new Event("offline"));

            expect(window.tachyon.dropConnection).not.toHaveBeenCalled();
        });
    });

    // The server holds the session open across a dropped socket, so a close on its
    // own says nothing about whether the user is still in a party, lobby or queue.
    // Throwing the state away here would tell them they had been dropped from all
    // three when they very likely had not.
    describe("when the socket drops on its own", () => {
        it("keeps party state", () => {
            simulateClose();

            expect(partyStore.activeParty).toBe("party-1");
            expect(partyStore.parties.size).toBe(1);
            expect(partyStore.state).toBe(PlayersPartyState.JoinedOnly);
        });

        it("keeps lobby state", () => {
            simulateClose();

            expect(lobbyStore.activeLobby).toBeDefined();
            expect(Object.keys(lobbyStore.lobbies)).toHaveLength(1);
        });

        it("keeps matchmaking state", () => {
            simulateClose();

            expect(matchmakingStore.status).toBe(MatchmakingStatus.Searching);
            expect(matchmakingStore.playlists).toHaveLength(1);
        });

        it("keeps chat", () => {
            simulateClose();

            expect(chatStore.lobbyChats.get("lobby-1")).toHaveLength(1);
            expect(chatStore.partyChats.get("party-1")).toHaveLength(1);
        });
    });

    describe("when the user chooses to go offline", () => {
        it("drops the state the server owns", async () => {
            await connectionLogic.goOffline();

            expect(partyStore.activeParty).toBeUndefined();
            expect(partyStore.parties.size).toBe(0);
            expect(partyStore.state).toBe(PlayersPartyState.None);
            expect(lobbyStore.activeLobby).toBeUndefined();
            expect(lobbyStore.lobbies).toEqual({});
            expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
            expect(matchmakingStore.playlists).toEqual([]);
            expect(matchmakingStore.playersQueued).toBe(0);
        });

        // Going offline ends the session that held the server's only copy of these
        // messages, so clearing them here would destroy history nothing can send
        // again. Entering the next lobby or party is what clears them.
        it("keeps the chat transcript the server can no longer send us", async () => {
            await connectionLogic.goOffline();

            expect(chatStore.lobbyChats.get("lobby-1")).toHaveLength(1);
            expect(chatStore.partyChats.get("party-1")).toHaveLength(1);
        });

        it("drops the marker, which the ended session leaves pointing at nothing", async () => {
            chatStore.lastMarker = "-576460745805023";

            await connectionLogic.goOffline();

            expect(chatStore.lastMarker).toBeNull();
        });

        it("keeps what the user picked rather than what the server said", async () => {
            await connectionLogic.goOffline();

            expect(matchmakingStore.selectedQueue).toBe("2v2");
            expect(lobbyStore.wantsListSubscription).toBe(true);
            expect(chatStore.userChats.get("1")).toHaveLength(1);
        });

        // Views index downloadsRequired by queue id, so emptying it crashed the matchmaking page.
        it("keeps the derived download requirements the views index into", async () => {
            await connectionLogic.goOffline();

            expect(matchmakingStore.downloadsRequired["2v2"]).toEqual({ engines: [], games: [], maps: ["somemap"] });
        });

        it("does not ask the dead socket to leave the party", async () => {
            await connectionLogic.goOffline();

            expect(window.tachyon.requestStructured).not.toHaveBeenCalledWith("party/leave");
        });

        it("stops wanting a connection so the close is not treated as a fault", async () => {
            await connectionLogic.goOffline();

            expect(connectionStore.wantsConnection).toBe(false);
        });

        // Cleanup runs before the socket's close event gets back to us, so anything
        // that checks isConnected first would otherwise send on a dying socket.
        it("counts as disconnected before the cleanup runs", async () => {
            let connectedWhenCleanupRan: boolean | undefined;
            const probe = onWentOffline.add(() => (connectedWhenCleanupRan = connectionStore.isConnected));

            await connectionLogic.goOffline();
            probe.destroy();

            expect(connectedWhenCleanupRan).toBe(false);
        });

        it("clears the rejoin prompt during the cleanup", async () => {
            tachyonStore.springConnectionDetails = { battleId: "battle-1" } as never;
            tachyonStore.rejoinModalOpen = true;
            let rejoinWhenCleanupRan: unknown;
            const probe = onWentOffline.add(() => (rejoinWhenCleanupRan = { details: tachyonStore.springConnectionDetails, modalOpen: tachyonStore.rejoinModalOpen }));

            await connectionLogic.goOffline();
            probe.destroy();

            expect(rejoinWhenCleanupRan).toEqual({ details: undefined, modalOpen: false });
        });

        it("drops a stale error so the status does not read as faulted", async () => {
            connectionActions.set({ error: "Error fetching server stats" });

            await connectionLogic.goOffline();

            expect(connectionStore.error).toBeUndefined();
        });

        it("survives being asked twice with nothing left to clear", async () => {
            await connectionLogic.goOffline();

            await expect(connectionLogic.goOffline()).resolves.not.toThrow();
        });
    });
});
