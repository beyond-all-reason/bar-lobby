// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { partyStore, party, PlayersPartyState } from "@renderer/store/party.store";
import { usePartyInviteState } from "@renderer/composables/usePartyInviteState";

vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));

const USER = "user-1";

function setParty({ members = 1, invited = 0, maxMembers = 4, memberIds = [] as string[], invitedIds = [] as string[] } = {}) {
    partyStore.activeParty = "party-1";
    partyStore.parties.set("party-1", {
        id: "party-1",
        members: [...memberIds, ...Array.from({ length: members }, (_, i) => `member-${i}`)].map((userId) => ({ userId, joinedAt: 0 })),
        invited: [...invitedIds, ...Array.from({ length: invited }, (_, i) => `invitee-${i}`)].map((userId) => ({ userId, invitedAt: 0 })),
        maxMembers,
        seen: true,
    });
}

beforeEach(() => {
    partyStore.activeParty = undefined;
    partyStore.parties.clear();
    partyStore.state = PlayersPartyState.None;
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("usePartyInviteState", () => {
    describe("without a party", () => {
        it("is not full", () => {
            expect(usePartyInviteState(USER).maxMembersReached.value).toBe(false);
        });

        it("does not have the user in it", () => {
            expect(usePartyInviteState(USER).userInParty.value).toBe(false);
        });

        it("has not invited the user", () => {
            expect(usePartyInviteState(USER).userInvited.value).toBe(false);
        });
    });

    describe("maxMembersReached", () => {
        it("counts members and invites together", () => {
            setParty({ members: 2, invited: 2, maxMembers: 4 });

            expect(usePartyInviteState(USER).maxMembersReached.value).toBe(true);
        });

        it("is false with room left", () => {
            setParty({ members: 2, invited: 1, maxMembers: 4 });

            expect(usePartyInviteState(USER).maxMembersReached.value).toBe(false);
        });
    });

    it("sees the user as a member", () => {
        setParty({ memberIds: [USER] });

        expect(usePartyInviteState(USER).userInParty.value).toBe(true);
    });

    it("sees the user as invited", () => {
        setParty({ invitedIds: [USER] });

        expect(usePartyInviteState(USER).userInvited.value).toBe(true);
    });

    it("follows a changing user id", () => {
        setParty({ memberIds: [USER] });
        const userId = ref("someone-else");
        const { userInParty } = usePartyInviteState(userId);
        expect(userInParty.value).toBe(false);

        userId.value = USER;

        expect(userInParty.value).toBe(true);
    });

    describe("inviteToParty", () => {
        it.each([PlayersPartyState.JoinedOnly, PlayersPartyState.JoinedAndInvited])("invites into the current party when %s", (state) => {
            partyStore.state = state;
            const requestInvite = vi.spyOn(party, "requestInvite").mockResolvedValue(undefined);

            usePartyInviteState(USER).inviteToParty();

            expect(requestInvite).toHaveBeenCalledWith({ userId: USER });
        });

        it.each([PlayersPartyState.None, PlayersPartyState.InvitedOnly])("creates a party first when %s", (state) => {
            partyStore.state = state;
            const requestCreateAndInvite = vi.spyOn(party, "requestCreateAndInvite").mockResolvedValue(undefined);

            usePartyInviteState(USER).inviteToParty();

            expect(requestCreateAndInvite).toHaveBeenCalledWith(USER);
        });
    });
});
