// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));

const { matchmakingStore, matchmaking, MatchmakingStatus } = await import("@renderer/store/matchmaking.store");
const { partyStore, party, PlayersPartyState } = await import("@renderer/store/party.store");
const { lobbyStore, lobby } = await import("@renderer/store/lobby.store");
const { chatStore, chat } = await import("@renderer/store/chat.store");

describe("clearOnlineState", () => {
    it("drops matchmaking state the server owns but keeps the user's queue pick", () => {
        matchmakingStore.status = MatchmakingStatus.Searching;
        matchmakingStore.playlists = [{ id: "1v1", name: "Duel", version: "3" }] as typeof matchmakingStore.playlists;
        matchmakingStore.playersQueued = 12;
        matchmakingStore.downloadsRequired = { "1v1": { engines: [], games: [], maps: ["somemap"] } };
        matchmakingStore.selectedQueue = "2v2";

        matchmaking.clearOnlineState();

        expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
        expect(matchmakingStore.playlists).toEqual([]);
        expect(matchmakingStore.playersQueued).toBe(0);
        expect(matchmakingStore.downloadsRequired).toEqual({});
        expect(matchmakingStore.selectedQueue).toBe("2v2");
    });

    it("drops party state without asking the dead socket to leave", async () => {
        const requestLeave = vi.spyOn(party, "requestLeave");
        partyStore.activeParty = "party-1";
        partyStore.state = PlayersPartyState.JoinedOnly;
        partyStore.parties.set("party-1", { id: "party-1", members: [], invited: [], seen: true } as never);

        party.clearOnlineState();

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

        lobby.clearOnlineState();

        expect(lobbyStore.lobbies).toEqual({});
        expect(lobbyStore.selectedLobby).toBeUndefined();
        expect(lobbyStore.activeLobby).toBeUndefined();
        expect(lobbyStore.wantsListSubscription).toBe(true);
    });

    it("drops lobby and party chat but keeps direct messages", () => {
        chatStore.lobbyChat.push({ userId: "1", text: "in lobby" } as never);
        chatStore.partyChat.push({ userId: "1", text: "in party" } as never);
        chatStore.userChats.set("1", [{ userId: "1", text: "dm" } as never]);

        chat.clearOnlineState();

        expect(chatStore.lobbyChat).toEqual([]);
        expect(chatStore.partyChat).toEqual([]);
        expect(chatStore.userChats.get("1")).toHaveLength(1);
    });
});
