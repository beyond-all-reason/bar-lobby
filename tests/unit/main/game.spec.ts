// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { Replay } from "@main/replays/replay";
import { EditionRefusalError } from "@shared/edition";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { ensure, spawn } = vi.hoisted(() => ({ ensure: vi.fn(), spawn: vi.fn() }));

vi.mock("child_process", () => ({ spawn }));
vi.mock("fs", () => ({ promises: { writeFile: vi.fn(async () => undefined) } }));
vi.mock("@main/content/content-api", () => ({ contentAPI: { ensure, markUsed: vi.fn(async () => undefined) } }));
vi.mock("@main/game/springsettings", () => ({ applyDefaultSpringsettings: vi.fn() }));
vi.mock("@main/utils/start-script-converter", () => ({ startScriptConverter: { generateScriptStr: vi.fn(async () => "[game] {}") } }));
vi.mock("@main/utils/logger", () => ({ logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }));
vi.mock("@main/config/app", () => ({ WRITE_DATA_PATH: "/state/data", REPLAYS_PATH: "/state/data/demos", getEnginePath: () => "/assets/engine", getAssetsPath: () => "/assets" }));

import { GameAPI } from "@main/game/game";

const script = `[game] {
    mapname=Quicksilver 1.2;
    gametype=Beyond All Reason test-1-abc;
}`;

describe("GameAPI launch", () => {
    let game: GameAPI;

    beforeEach(() => {
        ensure.mockReset().mockResolvedValue(undefined);
        // Spawning is where these tests stop: anything that reaches it has already passed the content check.
        spawn.mockReset().mockImplementation(() => {
            throw new Error("spawned");
        });
        game = new GameAPI();
    });

    it("asks for the map along with the engine and game", async () => {
        await expect(game.launchScript({ engineVersion: "2025.01.3", gameVersion: "byar:test", script })).rejects.toThrow("spawned");

        expect(ensure).toHaveBeenCalledWith([
            { type: "engine", id: "2025.01.3" },
            { type: "game", id: "Beyond All Reason test-1-abc" },
            { type: "map", id: "Quicksilver 1.2" },
        ]);
    });

    it.each([
        ["map", "content_unavailable_in_edition"],
        ["engine", "content_bundled_with_install"],
        ["game", "content_bundled_with_install"],
    ] as const)("does not start the game when the %s cannot be had", async (_, refusal) => {
        ensure.mockRejectedValue(new EditionRefusalError(refusal, "missing"));

        await expect(game.launchReplay({ engineVersion: "2025.01.3", gameVersion: "Beyond All Reason test-1-abc", mapSpringName: "Quicksilver 1.2", fileName: "a.sdfz" } as Replay)).rejects.toThrow(
            refusal
        );

        expect(spawn).not.toHaveBeenCalled();
    });

    it("leaves the map out when the launch does not name one", async () => {
        await expect(game.launchMultiplayer({ engineVersion: "2025.01.3", gameVersion: "Beyond All Reason test-1-abc", springString: "spring://host" })).rejects.toThrow("spawned");

        expect(ensure).toHaveBeenCalledWith([
            { type: "engine", id: "2025.01.3" },
            { type: "game", id: "Beyond All Reason test-1-abc" },
        ]);
    });
});
