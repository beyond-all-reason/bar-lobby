// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PartyState, UserSelfEventData } from "tachyon-protocol/types";

const api = vi.hoisted(() => ({
    handlers: new Map<string, (data: unknown) => void>(),
    tachyonRequest: vi.fn(),
}));

vi.mock("@renderer/api/tachyon", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@renderer/api/tachyon")>()),
    tachyonRequest: api.tachyonRequest,
    onTachyonEvent: (commandId: string, handler: (data: unknown) => void) => {
        api.handlers.set(commandId, handler);

        return () => {};
    },
}));
vi.mock("@renderer/store/me.store", () => ({ me: { userId: "me" } }));
vi.mock("@renderer/store/users.store", () => ({ subsManager: { setList: vi.fn(), clearAllFromList: vi.fn() } }));

const { me } = await import("@renderer/store/me.store");
const { subsManager } = await import("@renderer/store/users.store");
const { partyStore, partyUpdates, PlayersPartyState } = await import("@renderer/store/party.store");
const { partyLogic, initPartyLogic } = await import("@renderer/logic/party");
const { onWentOffline } = await import("@renderer/utils/offline-signal");

const emit = (commandId: string, data: unknown) => api.handlers.get(commandId)?.(data);

function makeParty(id: string, members: string[], invited: string[] = []): PartyState {
    return {
        id,
        members: members.map((userId) => ({ userId, joinedAt: 0 })),
        invited: invited.map((userId) => ({ userId, invitedAt: 0 })),
        maxMembers: 4,
    };
}

function emitUserSelf(userId: string, party: PartyState | null, invitedToParties: PartyState[] = []) {
    emit("user/self", { user: { userId, party, invitedToParties } } as unknown as UserSelfEventData);
}

const succeed = (data: unknown = {}) => ({ type: "response", status: "success", data });

describe("party logic", () => {
    beforeAll(() => {
        initPartyLogic();
    });

    beforeEach(() => {
        me.userId = "me";
        partyUpdates.clear();
        api.tachyonRequest.mockReset();
        vi.mocked(subsManager.setList).mockClear();
        vi.mocked(subsManager.clearAllFromList).mockClear();
    });

    describe("user/self", () => {
        it("takes the joined party and the invites from the event", () => {
            emitUserSelf("me", makeParty("joined", ["me", "friend"]), [makeParty("invite", ["host"], ["me"])]);

            expect(partyStore.activeParty).toBe("joined");
            expect(partyStore.parties.size).toBe(2);
            expect(partyStore.state).toBe(PlayersPartyState.JoinedAndInvited);
        });

        // me.userId still holds the previous account while me.store awaits its own user/self handling.
        it("goes by the user id in the event rather than me.userId", () => {
            me.userId = "previous-account";

            emitUserSelf("me", makeParty("joined", ["me"]));

            expect(partyStore.activeParty).toBe("joined");
            expect(partyStore.state).toBe(PlayersPartyState.JoinedOnly);
        });

        it("drops parties the event no longer lists", () => {
            emit("party/updated", makeParty("old", ["me"]));

            emitUserSelf("me", null);

            expect(partyStore.parties.size).toBe(0);
            expect(partyStore.activeParty).toBeUndefined();
            expect(partyStore.state).toBe(PlayersPartyState.None);
        });

        it("watches the other users in every party", () => {
            emitUserSelf("me", makeParty("joined", ["me", "friend"]), [makeParty("invite", ["host"], ["me", "stranger"])]);

            expect(subsManager.setList).toHaveBeenLastCalledWith(["friend", "host", "stranger"], expect.anything());
        });
    });

    describe("party events", () => {
        it("adds an invite from party/invited", () => {
            emit("party/invited", { party: makeParty("invite", ["host"], ["me"]) });

            expect(partyStore.state).toBe(PlayersPartyState.InvitedOnly);
            expect(partyStore.activeParty).toBeUndefined();
        });

        it("replaces the party from party/updated", () => {
            emit("party/updated", makeParty("joined", ["me"]));
            emit("party/updated", makeParty("joined", ["me", "friend"]));

            expect(partyStore.parties.get("joined")?.members).toHaveLength(2);
        });

        it("removes the party from party/removed", () => {
            emit("party/updated", makeParty("joined", ["me"]));

            emit("party/removed", { partyId: "joined" });

            expect(partyStore.parties.size).toBe(0);
            expect(partyStore.state).toBe(PlayersPartyState.None);
        });
    });

    describe("actions", () => {
        it("drops the party it was in once accepting an invite goes through", async () => {
            emitUserSelf("me", makeParty("old", ["me"]), [makeParty("new", ["host"], ["me"])]);
            api.tachyonRequest.mockResolvedValue(succeed());

            await partyLogic.acceptInvite({ partyId: "new" });

            expect(api.tachyonRequest).toHaveBeenCalledWith("party/acceptInvite", { partyId: "new" });
            expect(partyStore.parties.has("old")).toBe(false);
        });

        it("keeps the party it was in when accepting an invite fails", async () => {
            emitUserSelf("me", makeParty("old", ["me"]), [makeParty("new", ["host"], ["me"])]);
            const failure = new Error("party/acceptInvite failed");
            api.tachyonRequest.mockRejectedValue(failure);

            await expect(partyLogic.acceptInvite({ partyId: "new" })).rejects.toBe(failure);

            expect(partyStore.activeParty).toBe("old");
        });

        it("adds the party it created", async () => {
            api.tachyonRequest.mockResolvedValue(succeed({ party: makeParty("created", ["me"]) }));

            await partyLogic.create();

            expect(partyStore.activeParty).toBe("created");
            expect(partyStore.state).toBe(PlayersPartyState.JoinedOnly);
        });

        it("doesn't send the invite when creating the party fails", async () => {
            api.tachyonRequest.mockRejectedValue(new Error("party/create failed"));

            await expect(partyLogic.createAndInvite("friend")).rejects.toThrow();

            expect(api.tachyonRequest).not.toHaveBeenCalledWith("party/invite", expect.anything());
        });

        it("removes a declined invite", async () => {
            emit("party/invited", { party: makeParty("invite", ["host"], ["me"]) });
            api.tachyonRequest.mockResolvedValue(succeed());

            await partyLogic.declineInvite({ partyId: "invite" });

            expect(partyStore.parties.size).toBe(0);
        });

        it("removes the party it left", async () => {
            emit("party/updated", makeParty("joined", ["me"]));
            api.tachyonRequest.mockResolvedValue(succeed());

            await partyLogic.leave();

            expect(partyStore.parties.size).toBe(0);
            expect(partyStore.state).toBe(PlayersPartyState.None);
        });

        it("marks a party as seen", () => {
            emit("party/invited", { party: makeParty("invite", ["host"], ["me"]) });

            partyLogic.markSeen("invite");

            expect(partyStore.parties.get("invite")?.seen).toBe(true);
        });
    });

    describe("leaving the server", () => {
        it("clears parties and their watched users on going offline", () => {
            emit("party/updated", makeParty("joined", ["me", "friend"]));

            onWentOffline.dispatch();

            expect(partyStore.parties.size).toBe(0);
            expect(subsManager.clearAllFromList).toHaveBeenCalled();
        });

        it("tells the server it left on logout, without waiting on it", () => {
            emit("party/updated", makeParty("joined", ["me"]));
            api.tachyonRequest.mockReturnValue(new Promise(() => {}));

            partyLogic.onLogout();

            expect(api.tachyonRequest).toHaveBeenCalledWith("party/leave");
            expect(partyStore.parties.size).toBe(0);
        });

        it("doesn't let a failed leave on logout escape", async () => {
            emit("party/updated", makeParty("joined", ["me"]));
            api.tachyonRequest.mockRejectedValue(new Error("party/leave failed"));

            partyLogic.onLogout();
            await Promise.resolve();

            expect(partyStore.parties.size).toBe(0);
        });
    });
});
