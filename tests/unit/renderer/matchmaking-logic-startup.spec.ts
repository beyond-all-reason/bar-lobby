// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ tachyonRequest: vi.fn() }));

vi.mock("@renderer/api/tachyon", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@renderer/api/tachyon")>()),
    tachyonRequest: api.tachyonRequest,
    onTachyonEvent: () => () => {},
}));
vi.mock("@renderer/api/content", () => ({ contentApi: { missing: vi.fn(async () => []) } }));
vi.mock("@renderer/api/game", () => ({ gameApi: { onClosed: vi.fn() } }));
vi.mock("@renderer/store/tachyon.store", () => ({ tachyonStore: { isConnected: true } }));

const { initMatchmakingLogic } = await import("@renderer/logic/matchmaking");
const { onTachyonConnected } = await import("@renderer/utils/connection-signal");

const listRequests = () => api.tachyonRequest.mock.calls.filter(([commandId]) => commandId === "matchmaking/list").length;

describe("matchmaking logic startup", () => {
    it("leaves a connect that lands during the first list fetch to that fetch", async () => {
        let finishList: (response: unknown) => void = () => {};
        api.tachyonRequest.mockImplementation(() => new Promise((resolve) => (finishList = resolve)));

        const starting = initMatchmakingLogic();
        onTachyonConnected.dispatch();

        expect(listRequests()).toBe(1);

        finishList({ status: "success", data: { playlists: [] } });
        await starting;
        onTachyonConnected.dispatch();

        expect(listRequests()).toBe(2);
    });
});
