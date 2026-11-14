// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

const { running, spawned } = vi.hoisted(() => ({ running: { processes: [] as Array<{ exit: () => void }> }, spawned: [] as string[] }));

vi.mock("@main/utils/logger", () => ({ logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }));
vi.mock("@main/config/app", () => ({ getEnginePath: () => "/engine", WRITE_DATA_PATH: "/write", getAssetsPath: () => "/assets" }));
vi.mock("child_process", () => ({
    // A checksum process that only ends when the test says so, so overlap is observable rather than timed.
    spawn: (_binary: string, args: string[]) => {
        const listeners: Record<string, (code: number) => void> = {};
        spawned.push(args[args.length - 1]);
        running.processes.push({ exit: () => listeners.exit?.(0) });

        return { on: (event: string, callback: (code: number) => void) => void (listeners[event] = callback) };
    },
}));

import { calcChecksum, holdChecksums } from "@main/utils/checksums";

// The queue advances on microtasks, so nothing has spawned on the line after asking for it.
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function endOldestChecksum() {
    running.processes.shift()?.exit();
}

describe("checksum queue", () => {
    beforeEach(() => {
        running.processes.length = 0;
        spawned.length = 0;
    });

    it("runs one checksum at a time", async () => {
        const first = calcChecksum("2025.06.21", "a.sd7");
        const second = calcChecksum("2025.06.21", "b.sd7");
        await settle();

        expect(spawned).toEqual(["a.sd7"]);

        endOldestChecksum();
        await first;
        await settle();

        expect(spawned).toEqual(["a.sd7", "b.sd7"]);

        endOldestChecksum();
        await second;
    });

    // The bug this guards: waiting for the queue to drain and then deleting leaves a window where anything
    // can queue a checksum against the archive being removed.
    it("keeps a checksum queued during held work from starting", async () => {
        const order: string[] = [];
        let queued: Promise<void> | undefined;

        await holdChecksums(async () => {
            order.push("removal start");
            queued = calcChecksum("2025.06.21", "doomed.sd7");
            await settle();

            expect(spawned).toEqual([]);

            order.push("removal end");
        });
        await settle();

        expect(order).toEqual(["removal start", "removal end"]);
        expect(spawned).toEqual(["doomed.sd7"]);

        endOldestChecksum();
        await queued;
    });

    it("waits for a checksum already running before held work starts", async () => {
        const order: string[] = [];
        const checksum = calcChecksum("2025.06.21", "a.sd7").then(() => void order.push("checksum done"));
        const held = holdChecksums(async () => void order.push("removal"));
        await settle();

        expect(order).toEqual([]);

        endOldestChecksum();
        await Promise.all([checksum, held]);

        expect(order).toEqual(["checksum done", "removal"]);
    });

    // A rejecting removal must not leave the chain rejected, or every later checksum is skipped.
    it("survives held work that throws", async () => {
        await expect(holdChecksums(() => Promise.reject(new Error("EBUSY")))).rejects.toThrow("EBUSY");

        const after = calcChecksum("2025.06.21", "later.sd7");
        await settle();

        expect(spawned).toEqual(["later.sd7"]);

        endOldestChecksum();
        await after;
    });
});
