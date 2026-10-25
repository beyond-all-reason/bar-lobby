// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrivateUser, UserSelfEventData } from "tachyon-protocol/types";

vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/api/game", () => ({ gameApi: { onClosed: vi.fn() } }));
vi.mock("@renderer/store/db", () => ({
    db: {
        users: {
            where: vi.fn(() => ({ modify: vi.fn(async () => 0) })),
            put: vi.fn(),
        },
    },
}));

const eventHandlers = new Map<string, (data: unknown) => void>();

Object.assign(window.tachyon, {
    onEvent: (command: string, callback: (data: unknown) => void) => void eventHandlers.set(command, callback),
    onConnected: vi.fn(),
    requestStructured: vi.fn(async () => ({ status: "success", data: {} })),
});

const { MatchmakingStatus, matchmakingStore, matchmakingUpdates } = await import("@renderer/store/matchmaking.store");
const { initMatchmakingLogic } = await import("@renderer/logic/matchmaking");
const { provideUi } = await import("@renderer/logic/ui");

const ui = { matchWaiting: vi.fn(), queuesJoined: vi.fn(), queueListFailed: vi.fn() };

function emitUserSelf(matchmaking: PrivateUser["matchmaking"]) {
    const data = { user: { matchmaking } as PrivateUser } satisfies UserSelfEventData;
    eventHandlers.get("user/self")?.(data);
}

const foundState = (timeoutAt: number, queueId = "1v1") => ({
    state: "found" as const,
    queue: { id: queueId, version: "1", timeoutAt, hasAlreadyReadied: false },
    otherQueues: [],
});

describe("user/self matchmaking state", () => {
    beforeAll(async () => {
        provideUi(ui);
        await initMatchmakingLogic();
    });

    beforeEach(() => {
        vi.useFakeTimers();
        emitUserSelf({ state: "no_matchmaking" });
        matchmakingUpdates.set({ selectedQueue: "1v1" });
        ui.matchWaiting.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("updates the selected queue when user/self reports queuing", () => {
        emitUserSelf({ state: "queuing", queues: [{ id: "2v2", version: "1" }] });

        expect(matchmakingStore.status).toBe(MatchmakingStatus.Searching);
        expect(matchmakingStore.selectedQueue).toBe("2v2");
    });

    it("syncs the selected queue when user/self reports a found match", () => {
        emitUserSelf(foundState((Date.now() + 5000) * 1000, "2v2"));

        expect(matchmakingStore.selectedQueue).toBe("2v2");
    });

    it("reports the waiting match and starts the ready countdown when user/self reports found", () => {
        emitUserSelf(foundState((Date.now() + 5000) * 1000));

        expect(matchmakingStore.status).toBe(MatchmakingStatus.MatchFound);
        expect(matchmakingStore.readySecondsRemaining).toBe(5);
        expect(ui.matchWaiting).toHaveBeenCalledOnce();
    });

    it("counts the ready countdown down and returns to idle at the deadline", () => {
        emitUserSelf(foundState((Date.now() + 5000) * 1000));

        vi.advanceTimersByTime(2000);
        expect(matchmakingStore.readySecondsRemaining).toBe(3);

        vi.advanceTimersByTime(3000);
        expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
        expect(matchmakingStore.readySecondsRemaining).toBeUndefined();
    });

    it("returns to idle and stops the ready countdown when user/self reports no matchmaking", () => {
        matchmakingUpdates.set({ playersQueued: 5, playersReady: 3 });
        emitUserSelf(foundState((Date.now() + 5000) * 1000));

        emitUserSelf({ state: "no_matchmaking" });
        vi.advanceTimersByTime(2000);

        expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
        expect(matchmakingStore.readySecondsRemaining).toBeUndefined();
        expect(matchmakingStore.playersQueued).toBe(0);
        expect(matchmakingStore.playersReady).toBe(0);
    });

    it("clears readiness but keeps the queue count when matchmaking is lost", () => {
        matchmakingUpdates.set({ playersQueued: 5, playersReady: 3 });

        eventHandlers.get("matchmaking/lost")?.(undefined);

        expect(matchmakingStore.status).toBe(MatchmakingStatus.Searching);
        expect(matchmakingStore.playersQueued).toBe(5);
        expect(matchmakingStore.playersReady).toBe(0);
    });

    it("clears matchmaking counters when the match is cancelled", () => {
        matchmakingUpdates.set({ playersQueued: 5, playersReady: 3 });

        eventHandlers.get("matchmaking/cancelled")?.({ reason: "user_cancelled" });

        expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
        expect(matchmakingStore.playersQueued).toBe(0);
        expect(matchmakingStore.playersReady).toBe(0);
    });
});
