// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
    handlers: new Map<string, (data: unknown) => void>(),
    tachyonRequest: vi.fn(),
    missing: vi.fn(),
    gameClosed: [] as Array<() => void>,
}));

vi.mock("@renderer/api/tachyon", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@renderer/api/tachyon")>()),
    tachyonRequest: api.tachyonRequest,
    onTachyonEvent: (commandId: string, handler: (data: unknown) => void) => {
        api.handlers.set(commandId, handler);

        return () => {};
    },
}));
vi.mock("@renderer/api/content", () => ({ contentApi: { missing: api.missing } }));
vi.mock("@renderer/api/game", () => ({ gameApi: { onClosed: (handler: () => void) => api.gameClosed.push(handler) } }));
vi.mock("@renderer/store/tachyon.store", () => ({ tachyonStore: { isConnected: false } }));

const { TachyonIpcError, TachyonRequestError } = await import("@renderer/api/tachyon");
const { MatchmakingStatus, matchmakingStore, matchmakingUpdates } = await import("@renderer/store/matchmaking.store");
const { MatchmakingJoinRefused, matchmakingLogic, initMatchmakingLogic } = await import("@renderer/logic/matchmaking");
const { provideUi } = await import("@renderer/logic/ui");
const { onTachyonConnected } = await import("@renderer/utils/connection-signal");
const { onWentOffline } = await import("@renderer/utils/offline-signal");

const ui = { matchWaiting: vi.fn(), queuesJoined: vi.fn(), queueListFailed: vi.fn() };

const emit = (commandId: string, data?: unknown) => api.handlers.get(commandId)?.(data);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const playlist = (id: string, maps: string[] = []) => ({
    id,
    name: id,
    version: "3",
    numOfTeams: 2,
    teamSize: 1,
    ranked: true,
    engines: [],
    games: [],
    maps: maps.map((springName) => ({ springName })),
});

const failed = (commandId: string, reason: string) => new TachyonRequestError(commandId as never, { type: "response", commandId, messageId: "1", status: "failed", reason } as never);

function respondTo(responses: Record<string, () => unknown>) {
    api.tachyonRequest.mockImplementation(async (commandId: string) => {
        const respond = responses[commandId];
        if (!respond) throw new Error(`unexpected request ${commandId}`);

        return respond();
    });
}

describe("matchmaking logic", () => {
    beforeAll(async () => {
        provideUi(ui);
        await initMatchmakingLogic();
    });

    beforeEach(() => {
        onWentOffline.dispatch();
        matchmakingUpdates.set({ selectedQueue: "1v1" });
        api.tachyonRequest.mockReset();
        api.missing.mockReset().mockResolvedValue([]);
        Object.values(ui).forEach((fn) => fn.mockClear());
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("listing queues", () => {
        it("takes the playlists and works out what each one still needs downloaded", async () => {
            respondTo({ "matchmaking/list": () => ({ status: "success", data: { playlists: [playlist("2v2", ["somemap"])] } }) });
            api.missing.mockResolvedValue([{ type: "map", id: "somemap" }]);

            await matchmakingLogic.listQueues();

            expect(matchmakingStore.playlists.map((p) => p.id)).toEqual(["2v2"]);
            expect(matchmakingStore.selectedQueue).toBe("2v2");
            expect(matchmakingStore.downloadsRequired["2v2"]).toEqual({ engines: [], games: [], maps: ["somemap"] });
            expect(matchmakingStore.isLoadingQueues).toBe(false);
        });

        it("records the failure and lets it through", async () => {
            const failure = failed("matchmaking/list", "internal_error");
            respondTo({ "matchmaking/list": () => Promise.reject(failure) });

            await expect(matchmakingLogic.listQueues()).rejects.toBe(failure);

            expect(matchmakingStore.queueError).toBe("Failed to retrieve available queues");
            expect(matchmakingStore.isLoadingQueues).toBe(false);
        });

        it("refreshes the list on connect and reports a failure nobody clicked for", async () => {
            respondTo({ "matchmaking/list": () => Promise.reject(failed("matchmaking/list", "internal_error")) });

            onTachyonConnected.dispatch();
            await flush();

            expect(api.tachyonRequest).toHaveBeenCalledWith("matchmaking/list");
            expect(ui.queueListFailed).toHaveBeenCalledOnce();
        });
    });

    describe("joining a queue", () => {
        beforeEach(() => {
            matchmakingUpdates.set({ playlists: [playlist("1v1")], selectedQueue: "1v1" });
            matchmakingUpdates.setDownloadsRequired("1v1", { engines: [], games: [], maps: [] });
        });

        it("sends the selected playlist and starts searching", async () => {
            respondTo({ "matchmaking/queue": () => ({ status: "success" }) });

            await matchmakingLogic.joinQueue();

            expect(api.tachyonRequest).toHaveBeenCalledWith("matchmaking/queue", { queues: [{ id: "1v1", version: "3" }] });
            expect(matchmakingStore.status).toBe(MatchmakingStatus.Searching);
        });

        it("refuses without asking the server while downloads are still needed", async () => {
            matchmakingUpdates.setDownloadsRequired("1v1", { engines: [], games: [], maps: ["somemap"] });

            await expect(matchmakingLogic.joinQueue()).rejects.toEqual(new MatchmakingJoinRefused("downloads_required"));

            expect(api.tachyonRequest).not.toHaveBeenCalled();
            expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
        });

        it("refreshes the list and refuses when the selected queue has no download data", async () => {
            matchmakingUpdates.set({ selectedQueue: "unknown" });
            respondTo({ "matchmaking/list": () => ({ status: "success", data: { playlists: [playlist("1v1")] } }) });

            await expect(matchmakingLogic.joinQueue()).rejects.toEqual(new MatchmakingJoinRefused("bad_queue_data"));

            expect(api.tachyonRequest).toHaveBeenCalledWith("matchmaking/list");
        });

        it("lets a version mismatch through first, then refreshes the list and goes idle", async () => {
            const failure = failed("matchmaking/queue", "version_mismatch");
            let finishList: (response: unknown) => void = () => {};
            respondTo({
                "matchmaking/queue": () => Promise.reject(failure),
                "matchmaking/list": () => new Promise((resolve) => (finishList = resolve)),
            });

            await expect(matchmakingLogic.joinQueue()).rejects.toBe(failure);
            expect(api.tachyonRequest).toHaveBeenCalledWith("matchmaking/list");
            expect(matchmakingStore.status).toBe(MatchmakingStatus.JoinRequested);

            finishList({ status: "success", data: { playlists: [playlist("1v1")] } });
            await flush();

            expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
        });

        it("lets a missing queue through first, then refreshes the list and goes idle", async () => {
            matchmakingUpdates.set({ selectedQueue: "2v2" });
            matchmakingUpdates.setDownloadsRequired("2v2", { engines: [], games: [], maps: [] });
            let finishList: (response: unknown) => void = () => {};
            respondTo({ "matchmaking/list": () => new Promise((resolve) => (finishList = resolve)) });

            await expect(matchmakingLogic.joinQueue()).rejects.toEqual(new MatchmakingJoinRefused("queue_not_found"));
            expect(matchmakingStore.status).toBe(MatchmakingStatus.JoinRequested);

            finishList({ status: "success", data: { playlists: [playlist("1v1")] } });
            await flush();

            expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
        });

        it("keeps an error message for the view when the request never reached the server", async () => {
            const failure = new TachyonIpcError("matchmaking/queue", new Error("Not connected to server"));
            respondTo({ "matchmaking/queue": () => Promise.reject(failure) });

            await expect(matchmakingLogic.joinQueue()).rejects.toBe(failure);

            expect(matchmakingStore.errorMessage).toBe("Error with matchmaking/queue");
            expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
        });
    });

    describe("readying up and cancelling", () => {
        it("drops back to idle when ready fails", async () => {
            respondTo({ "matchmaking/ready": () => Promise.reject(failed("matchmaking/ready", "internal_error")) });

            await expect(matchmakingLogic.ready()).rejects.toBeInstanceOf(TachyonRequestError);

            expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
            expect(matchmakingStore.errorMessage).toBe("Error with matchmaking/ready");
        });

        it("goes idle straight away on cancel, before the server answers", async () => {
            matchmakingUpdates.set({ status: MatchmakingStatus.Searching });
            respondTo({ "matchmaking/cancel": () => new Promise(() => {}) });

            void matchmakingLogic.cancel();

            expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
        });
    });

    describe("server events", () => {
        it("starts the ready countdown on a found match", () => {
            vi.useFakeTimers();

            emit("matchmaking/found", { queueId: "1v1", timeoutMs: 10000 });

            expect(matchmakingStore.status).toBe(MatchmakingStatus.MatchFound);
            expect(matchmakingStore.readySecondsRemaining).toBe(10);
        });

        it("switches to the queue the party joined and reports it", () => {
            emit("matchmaking/queuesJoined", { queues: ["2v2"] });

            expect(matchmakingStore.selectedQueue).toBe("2v2");
            expect(matchmakingStore.status).toBe(MatchmakingStatus.Searching);
            expect(ui.queuesJoined).toHaveBeenCalledOnce();
        });

        it("refreshes the list when a match is cancelled because the queue changed", async () => {
            respondTo({ "matchmaking/list": () => ({ status: "success", data: { playlists: [] } }) });

            emit("matchmaking/cancelled", { reason: "version_changed" });
            await flush();

            expect(api.tachyonRequest).toHaveBeenCalledWith("matchmaking/list");
        });
    });

    it("goes idle when the game closes", () => {
        matchmakingUpdates.set({ status: MatchmakingStatus.MatchAccepted });

        api.gameClosed.forEach((handler) => handler());

        expect(matchmakingStore.status).toBe(MatchmakingStatus.Idle);
    });
});
