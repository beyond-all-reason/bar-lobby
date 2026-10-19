// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

const logic = vi.hoisted(() => ({
    listQueues: vi.fn(),
    joinQueue: vi.fn(),
    ready: vi.fn(),
    cancel: vi.fn(),
    selectQueue: vi.fn(),
    refreshRequiredDownloads: vi.fn(),
}));

vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/logic/matchmaking", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@renderer/logic/matchmaking")>()),
    matchmakingLogic: logic,
}));

const { notificationsApi } = await import("@renderer/api/notifications");
const { TachyonIpcError, TachyonRequestError } = await import("@renderer/api/tachyon");
const { MatchmakingJoinRefused } = await import("@renderer/logic/matchmaking");
const { useMatchmakingActions } = await import("@renderer/composables/useMatchmakingActions");

const queueFailure = (reason: string) => new TachyonRequestError("matchmaking/queue", { type: "response", commandId: "matchmaking/queue", messageId: "1", status: "failed", reason } as never);

describe("useMatchmakingActions", () => {
    const matchmaking = useMatchmakingActions();
    let consoleError: MockInstance<typeof console.error>;

    beforeEach(() => {
        vi.mocked(notificationsApi.alert).mockClear();
        Object.values(logic).forEach((fn) => fn.mockReset());
        consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleError.mockRestore();
    });

    it.each([
        ["downloads_required", "You have downloads required to join this queue.", "info"],
        ["bad_queue_data", "Bad queue data; refreshing list.", "error"],
        ["queue_not_found", "Selected queue not found. Refreshing list.", "error"],
    ] as const)("explains a %s refusal", async (reason, text, severity) => {
        logic.joinQueue.mockRejectedValue(new MatchmakingJoinRefused(reason));

        await matchmaking.joinQueue();

        expect(notificationsApi.alert).toHaveBeenCalledWith({ text, severity });
    });

    it.each([
        ["version_mismatch", "Queue version changed; refreshing list.", "info"],
        ["party_missing_asset", "Party queue rejected, required assets are missing for the queue.", "error"],
        ["already_queued", "Queue request rejected for reason: already_queued.", "error"],
    ] as const)("explains a server refusal for %s", async (reason, text, severity) => {
        logic.joinQueue.mockRejectedValue(queueFailure(reason));

        await matchmaking.joinQueue();

        expect(notificationsApi.alert).toHaveBeenCalledWith({ text, severity });
    });

    it("alerts without logging again when the join never reached the server", async () => {
        logic.joinQueue.mockRejectedValue(new TachyonIpcError("matchmaking/queue", new Error("Not connected to server")));

        await matchmaking.joinQueue();

        expect(notificationsApi.alert).toHaveBeenCalledWith({ text: "Tachyon error: matchmaking/queue", severity: "error" });
        expect(consoleError).not.toHaveBeenCalled();
    });

    it("logs failures the api layer didn't", async () => {
        const bug = new TypeError("Cannot read properties of undefined");
        logic.ready.mockRejectedValue(bug);

        await matchmaking.ready();

        expect(consoleError).toHaveBeenCalledWith("Error with request matchmaking/ready", bug);
        expect(notificationsApi.alert).toHaveBeenCalledWith({ text: "Tachyon error: matchmaking/ready", severity: "error" });
    });

    it.each([
        ["listQueues", "Tachyon error: matchmaking/list"],
        ["cancel", "Tachyon error: matchmaking/cancel"],
    ] as const)("alerts when %s fails", async (action, text) => {
        logic[action].mockRejectedValue(new TachyonIpcError("matchmaking/list", new Error("Not connected to server")));

        await matchmaking[action]();

        expect(notificationsApi.alert).toHaveBeenCalledWith({ text, severity: "error" });
    });
});
