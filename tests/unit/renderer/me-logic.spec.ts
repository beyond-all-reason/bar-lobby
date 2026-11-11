// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserSelfEventData } from "tachyon-protocol/types";

const api = vi.hoisted(() => ({
    tachyonRequest: vi.fn(),
    handlers: new Map<string, (data: unknown) => unknown>(),
}));

vi.mock("@renderer/api/tachyon", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@renderer/api/tachyon")>()),
    tachyonRequest: api.tachyonRequest,
    onTachyonEvent: (commandId: string, handler: (data: unknown) => unknown) => {
        api.handlers.set(commandId, handler);

        return () => {};
    },
}));
vi.mock("@renderer/api/auth", () => ({ authApi: { getIdentity: vi.fn(async () => undefined) } }));
vi.mock("@renderer/store/db", () => ({ db: { users: { where: () => ({ modify: async () => 0 }), put: vi.fn() } } }));
vi.mock("@renderer/store/battleHistory.store", () => ({ battleHistoryActions: { recordBattleEnded: vi.fn() } }));
vi.mock("@renderer/store/users.store", () => ({ subsManager: { attach: vi.fn(), detach: vi.fn(), clearAllFromList: vi.fn() } }));

const { provideUi } = await import("@renderer/logic/ui");
const { friendsLogic, initMeLogic } = await import("@renderer/logic/me");
const { me, meActions } = await import("@renderer/store/me.store");
const { subsManager } = await import("@renderer/store/users.store");
const { battleHistoryActions } = await import("@renderer/store/battleHistory.store");

const ui = {
    matchWaiting: vi.fn(),
    queuesJoined: vi.fn(),
    queueListFailed: vi.fn(),
    userSubscribeFailed: vi.fn(),
    userUnsubscribeFailed: vi.fn(),
    friendListFailed: vi.fn(),
};

const emit = (commandId: string, data: unknown) => api.handlers.get(commandId)?.(data);

describe("me logic", () => {
    beforeAll(async () => {
        provideUi(ui);
        await initMeLogic();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        api.tachyonRequest.mockReset();
        meActions.setFriends([], [], []);
    });

    it("takes identity and friends from user/self and watches them", async () => {
        await emit("user/self", {
            user: { userId: "u-me", username: "tester", friendIds: ["a"], outgoingFriendRequest: [{ to: "b" }], incomingFriendRequest: [{ from: "c" }] },
        } as unknown as UserSelfEventData);

        expect(me.userId).toBe("u-me");
        expect([...me.friendUserIds]).toEqual(["a"]);
        expect([...me.outgoingFriendRequestUserIds]).toEqual(["b"]);
        expect([...me.incomingFriendRequestUserIds]).toEqual(["c"]);
        expect(subsManager.attach).toHaveBeenCalledWith(["a", "b", "c"], expect.any(Symbol));
    });

    it.each([
        ["acceptRequest", "incoming"],
        ["rejectRequest", "incoming"],
        ["cancelRequest", "outgoing"],
    ] as const)("drops the request from the list even when %s fails", async (action, side) => {
        meActions.setFriends([], side === "outgoing" ? ["x"] : [], side === "incoming" ? ["x"] : []);
        api.tachyonRequest.mockRejectedValue(new Error("refused"));

        await expect(friendsLogic[action]("x")).rejects.toThrow("refused");

        expect(me.incomingFriendRequestUserIds.has("x")).toBe(false);
        expect(me.outgoingFriendRequestUserIds.has("x")).toBe(false);
    });

    it("keeps the friend and hands the failure back when removing fails", async () => {
        meActions.setFriends(["x"], [], []);
        api.tachyonRequest.mockRejectedValue(new Error("refused"));

        await expect(friendsLogic.remove("x")).rejects.toThrow("refused");

        expect(me.friendUserIds.has("x")).toBe(true);
    });

    it("reports a friend list that fails to load", async () => {
        api.tachyonRequest.mockRejectedValue(new Error("refused"));

        await expect(friendsLogic.fetchFriendList()).resolves.toBeUndefined();

        expect(ui.friendListFailed).toHaveBeenCalledOnce();
    });

    it("records ended battles in the history", () => {
        const ended = { battleId: "b-1" };

        emit("battle/ended", ended);

        expect(battleHistoryActions.recordBattleEnded).toHaveBeenCalledWith(ended);
    });
});
