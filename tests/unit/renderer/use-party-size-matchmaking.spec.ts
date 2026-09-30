// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { effectScope, nextTick, type EffectScope, type Ref } from "vue";
import { partyUpdates } from "@renderer/store/party.store";
import { matchmakingStore } from "@renderer/store/matchmaking.store";
import { usePartySizeMatchmaking, getPartySize } from "@renderer/composables/usePartySizeMatchmaking";

vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));

function makePlaylist(id: string, teamSize: number) {
    return {
        id,
        name: id,
        version: "1",
        numOfTeams: 2,
        teamSize,
        ranked: false,
        engines: [],
        games: [],
        maps: [],
    } as (typeof matchmakingStore.playlists)[number];
}

function makeMembers(count: number) {
    return Array.from({ length: count }, (_, i) => ({ userId: `${i}`, joinedAt: 0 }));
}

function makeInvited(count: number) {
    return Array.from({ length: count }, (_, i) => ({ userId: `invitee-${i}`, invitedAt: 0 }));
}

const myUserId = makeMembers(1)[0].userId;

function makeParty(id: string, memberCount: number, invitedCount = 0) {
    return { id, members: makeMembers(memberCount), invited: makeInvited(invitedCount), maxMembers: 10 };
}

function setupParty(memberCount: number, teamSize: number) {
    partyUpdates.set(makeParty("party-1", memberCount), myUserId);
    matchmakingStore.selectedQueue = "1v1";
    matchmakingStore.playlists = [makePlaylist("1v1", teamSize)];
}

let scope: EffectScope;
let partyTooLarge: Ref<boolean>;

beforeEach(() => {
    partyUpdates.clear();
    matchmakingStore.playlists = [];
    matchmakingStore.selectedQueue = "1v1";

    scope = effectScope();
    scope.run(() => {
        partyTooLarge = usePartySizeMatchmaking().partyTooLarge;
    });
});

afterEach(() => {
    scope.stop();
});

describe("usePartySizeMatchmaking", () => {
    describe("reactivity", () => {
        it("re-evaluates when activeParty changes", async () => {
            setupParty(2, 3);
            await nextTick();
            expect(partyTooLarge.value).toBe(false);

            partyUpdates.remove("party-1", myUserId);
            partyUpdates.set(makeParty("party-2", 4), myUserId);
            await nextTick();

            expect(partyTooLarge.value).toBe(true);
        });

        it("re-evaluates when the selected queue changes", async () => {
            setupParty(2, 3);
            matchmakingStore.playlists.push(makePlaylist("2v2", 1));
            await nextTick();
            expect(partyTooLarge.value).toBe(false);

            matchmakingStore.selectedQueue = "2v2";
            await nextTick();

            expect(partyTooLarge.value).toBe(true);
        });

        it("re-evaluates when playlists changes", async () => {
            setupParty(2, 3);
            await nextTick();
            expect(partyTooLarge.value).toBe(false);

            matchmakingStore.playlists = [makePlaylist("1v1", 1)];
            await nextTick();

            expect(partyTooLarge.value).toBe(true);
        });

        it("re-evaluates when the party's members change", async () => {
            setupParty(2, 3);
            await nextTick();
            expect(partyTooLarge.value).toBe(false);

            partyUpdates.set(makeParty("party-1", 4), myUserId);
            await nextTick();

            expect(partyTooLarge.value).toBe(true);
        });

        it("re-evaluates when the party's invited list changes", async () => {
            setupParty(2, 3);
            await nextTick();
            expect(partyTooLarge.value).toBe(false);

            partyUpdates.set(makeParty("party-1", 2, 1), myUserId);
            await nextTick();

            // Invites don't factor into the size comparison, so the result is expected to stay the same.
            expect(partyTooLarge.value).toBe(false);
        });
    });

    describe("false-guard cases", () => {
        it("is false when there is no active party", async () => {
            matchmakingStore.playlists = [makePlaylist("1v1", 1)];
            await nextTick();

            expect(partyTooLarge.value).toBe(false);
        });

        it("is false when playlists is empty", async () => {
            partyUpdates.set(makeParty("party-1", 2), myUserId);
            await nextTick();

            expect(partyTooLarge.value).toBe(false);
        });
    });

    describe("size comparison", () => {
        it("is false when members are fewer than the team size", async () => {
            setupParty(1, 2);
            await nextTick();

            expect(partyTooLarge.value).toBe(false);
        });

        it("is false when members equal the team size", async () => {
            setupParty(2, 2);
            await nextTick();

            expect(partyTooLarge.value).toBe(false);
        });

        it("is true when members exceed the team size", async () => {
            setupParty(3, 2);
            await nextTick();

            expect(partyTooLarge.value).toBe(true);
        });
    });
});

describe("getPartySize", () => {
    beforeEach(() => {
        partyUpdates.clear();
    });

    it("returns 0 when there is no active party", () => {
        expect(getPartySize()).toBe(0);
    });

    it("returns the member count of the active party", () => {
        partyUpdates.set(makeParty("party-1", 3), myUserId);

        expect(getPartySize()).toBe(3);
    });
});
