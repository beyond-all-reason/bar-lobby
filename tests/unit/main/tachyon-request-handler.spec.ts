// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TachyonClientRequestHandlers } from "@main/tachyon/tachyon-client";
import { BattleStartRequestData } from "tachyon-protocol/types";

const { send, missing } = vi.hoisted(() => ({ send: vi.fn(), missing: vi.fn() }));

vi.mock("@main/content/content-api", () => ({ contentAPI: { missing } }));

const { createTachyonRequestHandlers } = await import("@main/tachyon/tachyon.handlers");

function getHandlers() {
    return createTachyonRequestHandlers({ send } as never);
}

// Type coverage assertion to ensure all handlers are correctly typed
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _typeCoverageAssertion: TachyonClientRequestHandlers = getHandlers();

describe("createTachyonRequestHandlers", () => {
    beforeEach(() => {
        send.mockReset();
        missing.mockReset();
        missing.mockReturnValue([]);
    });

    it("handles battle/start by sending the spring url, data, and returning success", async () => {
        const handlers = getHandlers();
        const data: BattleStartRequestData = {
            ip: "127.0.0.1",
            port: 8452,
            username: "tester",
            password: "secret",
            engine: { version: "105.1.1" },
            game: { springName: "byar:test-game" },
            map: { springName: "map:comet-catcher" },
        };
        const response = await handlers["battle/start"](data);

        expect(send).toHaveBeenCalledWith("tachyon:battleStart", "spring://tester:secret@127.0.0.1:8452", data);
        expect(response).toEqual({ status: "success" });
    });

    it("returns complete when game, maps, and engines are all installed", async () => {
        const handlers = getHandlers();

        const request = {
            queueId: "1v1",
            version: "1",
            game: "byar:test-game",
            maps: ["map:comet-catcher", "map:red-comet"],
            engines: ["engine:105.1.1"],
        };

        const response = await handlers["matchmaking/checkAssets"](request);

        expect(missing).toHaveBeenCalledWith([
            { type: "game", id: "byar:test-game" },
            { type: "map", id: "map:comet-catcher" },
            { type: "map", id: "map:red-comet" },
            { type: "engine", id: "engine:105.1.1" },
        ]);
        expect(response).toEqual({
            status: "success",
            data: { assetStatus: "complete" },
        });
    });

    it("returns missing when any required item is not installed", async () => {
        const handlers = getHandlers();

        missing.mockReturnValue([{ type: "map", id: "map:red-comet" }]);

        const response = await handlers["matchmaking/checkAssets"]({
            queueId: "1v1",
            version: "1",
            game: "byar:test-game",
            maps: ["map:comet-catcher", "map:red-comet"],
            engines: ["engine:105.1.1"],
        });

        expect(response).toEqual({
            status: "success",
            data: { assetStatus: "missing" },
        });
    });
});
