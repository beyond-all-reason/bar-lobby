// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Replay } from "@main/replays/replay";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { ensure, parsed, copied } = vi.hoisted(() => ({
    ensure: vi.fn(),
    parsed: { replay: null as Replay | null },
    copied: [] as string[],
}));

vi.mock("@main/utils/logger", () => ({ logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }));
vi.mock("@main/config/app", () => ({ REPLAYS_PATH: "/replays" }));
vi.mock("@main/content/content-api", () => ({ contentAPI: { ensure } }));
vi.mock("@main/replays/parse-replay", () => ({ asyncParseReplay: async () => parsed.replay }));
vi.mock("@main/game/game", () => ({ gameAPI: { isGameRunning: () => false } }));
vi.mock("chokidar", () => ({ default: { watch: () => ({ on: () => ({ on: () => ({}) }) }) } }));
vi.mock("fs", () => ({
    default: {
        promises: {
            copyFile: async (from: string) => void copied.push(from),
            mkdir: vi.fn(),
            readdir: async () => [],
            rm: vi.fn(),
        },
    },
}));

import { ReplaysAPI } from "@main/replays/replays";

function replay(mapSpringName: string): Replay {
    return { fileName: "2026-08-01_bar.sdfz", mapSpringName } as Replay;
}

describe("ReplaysAPI.copyParseReplay", () => {
    let replays: ReplaysAPI;
    let cached: Replay[];

    beforeEach(() => {
        ensure.mockReset().mockResolvedValue(undefined);
        copied.length = 0;
        parsed.replay = replay("Quicksilver 1.2");

        replays = new ReplaysAPI();
        cached = [];
        replays.onReplayCached.add((r) => cached.push(r));
    });

    it("copies the replay in and reports it", async () => {
        await replays.copyParseReplay("/downloads/2026-08-01_bar.sdfz");

        expect(copied).toEqual(["/downloads/2026-08-01_bar.sdfz"]);
        expect(cached).toHaveLength(1);
        expect(ensure).toHaveBeenCalledWith([{ type: "map", id: "Quicksilver 1.2" }]);
    });

    // onReplayCached is what puts the replay in front of the user, and the map is a convenience on top of
    // it. A refused map download must not swallow the replay.
    it("reports the replay even when its map cannot be fetched", async () => {
        ensure.mockRejectedValue(new Error("Not enough free space in /assets"));

        await expect(replays.copyParseReplay("/downloads/2026-08-01_bar.sdfz")).resolves.toBeUndefined();

        expect(cached).toHaveLength(1);
    });

    it("reports the replay before waiting on the map", async () => {
        const order: string[] = [];
        replays.onReplayCached.add(() => order.push("cached"));
        ensure.mockImplementation(async () => void order.push("map fetched"));

        await replays.copyParseReplay("/downloads/2026-08-01_bar.sdfz");

        expect(order).toEqual(["cached", "map fetched"]);
    });
});
