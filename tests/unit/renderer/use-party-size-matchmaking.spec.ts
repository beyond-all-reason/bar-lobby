// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { effectScope, nextTick, type EffectScope, type Ref } from "vue";
import { partyStore } from "@renderer/store/party.store";
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

function setupParty(memberCount: number, teamSize: number) {
    partyStore.activeParty = "party-1";
    partyStore.parties.set("party-1", { id: "party-1", members: makeMembers(memberCount), invited: [], maxMembers: 10, seen: true });
    matchmakingStore.selectedQueue = "1v1";
    matchmakingStore.playlists = [makePlaylist("1v1", teamSize)];
}

let scope: EffectScope;
let partyTooLarge: Ref<boolean>;

beforeEach(() => {
    partyStore.activeParty = undefined;
    partyStore.parties.clear();
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
            partyStore.parties.set("party-2", { id: "party-2", members: makeMembers(4), invited: [], maxMembers: 10, seen: true });
            await nextTick();
            expect(partyTooLarge.value).toBe(false);

            partyStore.activeParty = "party-2";
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

            partyStore.parties.get("party-1")!.members = makeMembers(4);
            await nextTick();

            expect(partyTooLarge.value).toBe(true);
        });

        it("re-evaluates when the party's invited list changes", async () => {
            setupParty(2, 3);
            await nextTick();
            expect(partyTooLarge.value).toBe(false);

            partyStore.parties.get("party-1")!.invited = makeInvited(1);
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
            partyStore.activeParty = "party-1";
            partyStore.parties.set("party-1", { id: "party-1", members: makeMembers(2), invited: [], maxMembers: 10, seen: true });
            await nextTick();

            expect(partyTooLarge.value).toBe(false);
        });

        it("is false when the active party isn't found in any party's members", async () => {
            matchmakingStore.playlists = [makePlaylist("1v1", 1)];
            partyStore.activeParty = "missing-party";
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
        partyStore.activeParty = undefined;
        partyStore.parties.clear();
    });

    it("returns 0 when there is no active party", () => {
        expect(getPartySize()).toBe(0);
    });

    it("returns 0 when the active party isn't in the parties map", () => {
        partyStore.activeParty = "missing-party";

        expect(getPartySize()).toBe(0);
    });

    it("returns the member count of the active party", () => {
        partyStore.activeParty = "party-1";
        partyStore.parties.set("party-1", { id: "party-1", members: makeMembers(3), invited: [], maxMembers: 10, seen: true });

        expect(getPartySize()).toBe(3);
    });
});
