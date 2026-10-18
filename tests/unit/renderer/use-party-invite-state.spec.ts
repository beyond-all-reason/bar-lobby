// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { PartyState } from "tachyon-protocol/types";
import { partyUpdates, PlayersPartyState } from "@renderer/store/party.store";
import { partyLogic } from "@renderer/logic/party";
import { usePartyInviteState } from "@renderer/composables/usePartyInviteState";

vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));

const USER = "user-1";
const SELF = "self";

function makeParty(id: string, members: string[], invited: string[] = [], maxMembers = 4): PartyState {
    return {
        id,
        members: members.map((userId) => ({ userId, joinedAt: 0 })),
        invited: invited.map((userId) => ({ userId, invitedAt: 0 })),
        maxMembers,
    };
}

function setParty({ members = 1, invited = 0, maxMembers = 4, memberIds = [] as string[], invitedIds = [] as string[] } = {}) {
    const party = makeParty(
        "party-1",
        [...memberIds, ...Array.from({ length: members }, (_, i) => `member-${i}`)],
        [...invitedIds, ...Array.from({ length: invited }, (_, i) => `invitee-${i}`)],
        maxMembers
    );

    // "member-0" plays the current user so this party becomes the active party.
    partyUpdates.set(party, "member-0");
}

beforeEach(() => {
    partyUpdates.clear();
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
            if (state === PlayersPartyState.JoinedOnly) {
                partyUpdates.replaceAll([makeParty("joined", [SELF])], SELF);
            } else {
                partyUpdates.replaceAll([makeParty("joined", [SELF]), makeParty("invited", [], [SELF])], SELF);
            }
            const invite = vi.spyOn(partyLogic, "invite").mockResolvedValue(undefined);

            usePartyInviteState(USER).inviteToParty();

            expect(invite).toHaveBeenCalledWith({ userId: USER });
        });

        it.each([PlayersPartyState.None, PlayersPartyState.InvitedOnly])("creates a party first when %s", (state) => {
            if (state === PlayersPartyState.InvitedOnly) {
                partyUpdates.replaceAll([makeParty("invited", [], [SELF])], SELF);
            }
            const createAndInvite = vi.spyOn(partyLogic, "createAndInvite").mockResolvedValue(undefined);

            usePartyInviteState(USER).inviteToParty();

            expect(createAndInvite).toHaveBeenCalledWith(USER);
        });
    });
});
