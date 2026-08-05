// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

const { send, gameIsInstalled, mapIsInstalled, engineIsInstalled } = vi.hoisted(() => ({
    send: vi.fn(),
    gameIsInstalled: vi.fn(),
    mapIsInstalled: vi.fn(),
    engineIsInstalled: vi.fn(),
}));

vi.mock("@main/content/game/game-content", () => ({
    gameContentAPI: {
        isVersionInstalled: gameIsInstalled,
    },
}));

vi.mock("@main/content/maps/map-content", () => ({
    mapContentAPI: {
        isVersionInstalled: mapIsInstalled,
    },
}));

vi.mock("@main/content/engine/engine-content", () => ({
    engineContentAPI: {
        isVersionInstalled: engineIsInstalled,
    },
}));

const { createTachyonRequestHandlers } = await import("@main/tachyon/tachyon.handlers");

function getHandlers() {
    return createTachyonRequestHandlers({ send } as never);
}

describe("createTachyonRequestHandlers", () => {
    beforeEach(() => {
        send.mockReset();
        gameIsInstalled.mockReset();
        mapIsInstalled.mockReset();
        engineIsInstalled.mockReset();

        gameIsInstalled.mockReturnValue(true);
        mapIsInstalled.mockReturnValue(true);
        engineIsInstalled.mockReturnValue(true);
    });

    it("handles battle/start by sending the spring url and returning success", async () => {
        const handlers = getHandlers();

        const response = await handlers["battle/start"]?.({
            ip: "127.0.0.1",
            port: 8452,
            username: "tester",
            password: "secret",
            engine: { version: "105.1.1" },
            game: { springName: "byar:test-game" },
            map: { springName: "map:comet-catcher" },
        });

        expect(send).toHaveBeenCalledWith("tachyon:battleStart", "spring://tester:secret@127.0.0.1:8452");
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

        const response = await handlers["matchmaking/checkAssets"]?.(request);

        expect(gameIsInstalled).toHaveBeenCalledWith("byar:test-game");
        expect(mapIsInstalled).toHaveBeenCalledWith("map:comet-catcher");
        expect(mapIsInstalled).toHaveBeenCalledWith("map:red-comet");
        expect(engineIsInstalled).toHaveBeenCalledWith("engine:105.1.1");
        expect(response).toEqual({
            status: "success",
            data: { assetStatus: "complete" },
        });
    });

    it("returns missing when any required item is not installed", async () => {
        const handlers = getHandlers();

        const missingMaps = new Set(["map:red-comet"]);
        mapIsInstalled.mockImplementation((map: string) => !missingMaps.has(map));

        const response = await handlers["matchmaking/checkAssets"]?.({
            queueId: "1v1",
            version: "1",
            game: "byar:test-game",
            maps: ["map:comet-catcher", "map:red-comet"],
            engines: ["engine:105.1.1"],
        });

        expect(gameIsInstalled).toHaveBeenCalledWith("byar:test-game");
        expect(mapIsInstalled).toHaveBeenCalledWith("map:comet-catcher");
        expect(mapIsInstalled).toHaveBeenCalledWith("map:red-comet");
        expect(response).toEqual({
            status: "success",
            data: { assetStatus: "missing" },
        });
    });
});
