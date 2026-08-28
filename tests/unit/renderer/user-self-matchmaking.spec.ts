// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrivateUser } from "tachyon-protocol/types";

vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/store/db", () => ({
    db: {
        users: {
            where: vi.fn(() => ({ modify: vi.fn(async () => 0) })),
            put: vi.fn(),
        },
    },
}));

Object.assign(window.tachyon, {
    onEvent: vi.fn(),
    onConnected: vi.fn(),
    request: vi.fn(async () => ({ data: {} })),
});

const { MatchmakingStatus, initializeMatchmakingStore, matchmakingStore } = await import("@renderer/store/matchmaking.store");
const { router } = await import("@renderer/router");
const { onUserSelfMatchmakingSignal } = await import("@renderer/utils/user-self-signal");

function emitUserSelf(matchmaking: PrivateUser["matchmaking"]) {
    onUserSelfMatchmakingSignal.dispatch(matchmaking);
}

describe("user/self matchmaking state", () => {
    beforeAll(async () => {
        await initializeMatchmakingStore();
    });

    beforeEach(() => {
        vi.useFakeTimers();
        matchmakingStore.status = MatchmakingStatus.Idle;
        matchmakingStore.selectedQueue = "1v1";
        matchmakingStore.queueTimeout = undefined;
        matchmakingStore.readyCountdownInterval = undefined;
        matchmakingStore.readySecondsRemaining = undefined;
        vi.mocked(router.push).mockReset();
    });

    it("updates the selected queue when user/self reports queuing", async () => {
        await emitUserSelf({ state: "queuing", queues: [{ id: "2v2", version: "1" }] });

        expect(matchmakingStore.status).toBe(MatchmakingStatus.Searching);
        expect(matchmakingStore.selectedQueue).toBe("2v2");
    });

    it("opens the matchmaking view and starts the ready countdown when user/self reports found", async () => {
        const timeoutAt = (Date.now() + 5000) * 1000;

        await emitUserSelf({
            state: "found",
            queue: { id: "1v1", version: "1", timeoutAt, hasAlreadyReadied: false },
            otherQueues: [],
        });

        expect(matchmakingStore.status).toBe(MatchmakingStatus.MatchFound);
        expect(matchmakingStore.readySecondsRemaining).toBeGreaterThan(0);
        expect(matchmakingStore.readyCountdownInterval).toBeDefined();
        expect(matchmakingStore.queueTimeout).toBeDefined();
        expect(router.push).toHaveBeenCalledWith("/play/matchmaking");
    });

    it("returns to idle and clears the ready countdown when user/self reports no matchmaking", async () => {
        await emitUserSelf({
            state: "found",
            queue: { id: "1v1", version: "1", timeoutAt: (Date.now() + 5000) * 1000, hasAlreadyReadied: false },
            otherQueues: [],
        });

        await emitUserSelf({ state: "no_matchmaking" });

        expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
        expect(matchmakingStore.readySecondsRemaining).toBeUndefined();
        expect(matchmakingStore.readyCountdownInterval).toBeUndefined();
        expect(matchmakingStore.queueTimeout).toBeUndefined();
    });
});
