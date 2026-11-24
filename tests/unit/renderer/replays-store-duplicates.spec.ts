// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Replay } from "@main/replays/replay";

const { rows, listeners, deleteFile } = vi.hoisted(() => ({
    rows: new Map<string, { fileName: string; gameId: string; gameDurationMs: number }>(),
    listeners: { cached: undefined as ((replay: Replay) => void) | undefined },
    deleteFile: vi.fn(async () => {}),
}));

// Each step yields, so concurrent stores interleave the way Dexie's async calls do.
const tick = () => Promise.resolve();

vi.mock("@renderer/store/db", () => {
    type Row = { fileName: string; gameId: string; gameDurationMs: number };
    const matching = (filter: (row: Row) => boolean) => ({
        and: (more: (row: Row) => boolean) => matching((row) => filter(row) && more(row)),
        first: async () => {
            await tick();
            return [...rows.values()].find(filter);
        },
        delete: async () => {
            await tick();
            for (const row of [...rows.values()].filter(filter)) rows.delete(row.fileName);
        },
        toArray: async () => [...rows.values()].filter(filter),
    });

    return {
        db: {
            replays: {
                where: (field: keyof Row) => ({ equals: (value: unknown) => matching((row) => row[field] === value) }),
                put: async (row: Row) => {
                    await tick();
                    rows.set(row.fileName, row);
                },
                toArray: async () => [...rows.values()],
            },
        },
    };
});

vi.stubGlobal(
    "window",
    Object.assign(window, {
        replays: {
            onReplayCached: (callback: (replay: Replay) => void) => (listeners.cached = callback),
            onReplayDeleted: vi.fn(),
            onHighlightOpened: vi.fn(),
            sync: vi.fn(),
            delete: deleteFile,
        },
    })
);

const { initReplaysStore } = await import("@renderer/store/replays.store");
await initReplaysStore();

const replay = (fileName: string, gameDurationMs: number) => ({ fileName, gameId: "game-1", gameDurationMs }) as Replay;

async function settle() {
    for (let i = 0; i < 100; i++) await tick();
}

describe("replays of a rejoined game", () => {
    beforeEach(() => {
        rows.clear();
        deleteFile.mockClear();
    });

    it("keeps only the longer replay when both arrive at once", async () => {
        listeners.cached!(replay("short.sdfz", 1000));
        listeners.cached!(replay("long.sdfz", 5000));
        await settle();

        expect([...rows.keys()]).toEqual(["long.sdfz"]);
        expect(deleteFile).toHaveBeenCalledExactlyOnceWith("short.sdfz");
    });

    it("keeps the stored replay when the newcomer is shorter", async () => {
        listeners.cached!(replay("long.sdfz", 5000));
        await settle();
        listeners.cached!(replay("short.sdfz", 1000));
        await settle();

        expect([...rows.keys()]).toEqual(["long.sdfz"]);
        expect(deleteFile).toHaveBeenCalledExactlyOnceWith("short.sdfz");
    });

    it("keeps going after a store fails", async () => {
        deleteFile.mockRejectedValueOnce(new Error("locked"));
        listeners.cached!(replay("long.sdfz", 5000));
        listeners.cached!(replay("short.sdfz", 1000));
        listeners.cached!({ fileName: "other.sdfz", gameId: "game-2", gameDurationMs: 1 } as Replay);
        await settle();

        expect(rows.has("other.sdfz")).toBe(true);
    });
});
