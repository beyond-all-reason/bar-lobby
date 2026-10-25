// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Lobby } from "@renderer/model/lobby";

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

const { lobby, lobbyStore, initLobbyStore } = await import("@renderer/store/lobby.store");
const { me } = await import("@renderer/store/me.store");

const emit = (command: string, data: unknown) => handlers.get(command)?.(data);

type Vote = NonNullable<Lobby["currentVote"]>;

const firstVote: Vote = {
    id: "vote-1",
    action: { type: "start" },
    initiator: "1",
    voters: { "1": { vote: "yes" }, "2": { vote: "no" }, "3": { vote: "abstain" } },
    until: 1_000_000,
    quorum: 3,
    majority: 0.5,
};

async function joinLobbyWithVote(currentVote: Vote | undefined) {
    const joinResponse = {
        status: "success",
        data: { id: "lobby-1", players: {}, spectators: {}, bots: {}, currentVote },
    } satisfies Awaited<ReturnType<typeof window.tachyon.requestStructured>>;
    vi.mocked(window.tachyon.requestStructured).mockResolvedValue(joinResponse);
    await lobby.requestJoinLobby({ id: "lobby-1", pushLobbyView: false });
}

describe("lobby vote updates", () => {
    beforeAll(async () => {
        me.userId = "1";
        await initLobbyStore();
    });

    beforeEach(() => {
        lobbyStore.activeLobby = undefined;
        vi.mocked(window.tachyon.requestStructured).mockReset();
    });

    it("replaces the current vote when an update brings a vote with a different id", async () => {
        await joinLobbyWithVote(firstVote);
        const secondVote: Vote = {
            id: "vote-2",
            action: { type: "start" },
            initiator: "4",
            voters: { "1": { vote: "pending" }, "4": { vote: "yes" } },
            until: 2_000_000,
            quorum: 2,
            majority: 0.6,
        };

        emit("lobby/updated", { id: "lobby-1", currentVote: secondVote });

        // Voters 2 and 3 only took part in the first vote, so they must not carry over.
        expect(lobbyStore.activeLobby?.currentVote).toEqual(secondVote);
    });

    it("keeps the rest of the vote when a patch without an id updates the voters", async () => {
        await joinLobbyWithVote(firstVote);

        emit("lobby/updated", { id: "lobby-1", currentVote: { voters: { "2": { vote: "yes" } } } });

        expect(lobbyStore.activeLobby?.currentVote).toEqual({
            ...firstVote,
            voters: { "1": { vote: "yes" }, "2": { vote: "yes" }, "3": { vote: "abstain" } },
        });
    });

    it("merges a patch that repeats the current vote id", async () => {
        await joinLobbyWithVote(firstVote);

        emit("lobby/updated", { id: "lobby-1", currentVote: { id: "vote-1", voters: { "3": { vote: "no" } } } });

        expect(lobbyStore.activeLobby?.currentVote).toEqual({
            ...firstVote,
            voters: { "1": { vote: "yes" }, "2": { vote: "no" }, "3": { vote: "no" } },
        });
    });

    it("sets a new vote when there was no vote before", async () => {
        await joinLobbyWithVote(undefined);

        emit("lobby/updated", { id: "lobby-1", currentVote: firstVote });

        expect(lobbyStore.activeLobby?.currentVote).toEqual(firstVote);
    });

    it("clears the vote when the update sets it to null", async () => {
        await joinLobbyWithVote(firstVote);

        emit("lobby/updated", { id: "lobby-1", currentVote: null });

        expect(lobbyStore.activeLobby?.currentVote).toBeUndefined();
    });
});
