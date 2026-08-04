// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MAX_CONCURRENT_DOWNLOADS } from "@main/config/content-policy";
import { ContentOperation, ContentQueue } from "@main/content/content-queue";
import { ContentRef, ContentType } from "@main/content/content-ref";
import { describe, expect, it, vi } from "vitest";

function deferred() {
    let release!: () => void;
    const settled = new Promise<void>((resolve) => {
        release = resolve;
    });

    return { settled, release };
}

type Call = { operation: ContentOperation; type: ContentType; ids: string[] };

function setup(options: { present?: Set<string>; run?: (call: Call) => Promise<void> } = {}) {
    const present = options.present ?? new Set<string>();
    const calls: Call[] = [];

    const run = vi.fn(async (operation: ContentOperation, type: ContentType, ids: string[]) => {
        calls.push({ operation, type, ids });
        if (options.run) {
            await options.run({ operation, type, ids });
        }
        ids.forEach((id) => (operation === "acquire" ? present.add(`${type}:${id}`) : present.delete(`${type}:${id}`)));
    });

    const queue = new ContentQueue(run, (ref) => present.has(`${ref.type}:${ref.id}`));

    return { queue, run, calls, present };
}

const map = (id: string): ContentRef => ({ type: "map", id });

describe("ContentQueue", () => {
    it("acquires a queued ref and resolves once it is on disk", async () => {
        const { queue, calls } = setup();

        await queue.enqueue("acquire", map("Quicksilver"));

        expect(calls).toEqual([{ operation: "acquire", type: "map", ids: ["Quicksilver"] }]);
    });

    it("returns the in-flight promise for a ref already being acquired", async () => {
        const gate = deferred();
        const { queue, run } = setup({ run: () => gate.settled });

        const first = queue.enqueue("acquire", map("Quicksilver"));
        const second = queue.enqueue("acquire", map("Quicksilver"));

        expect(second).toBe(first);

        gate.release();
        await Promise.all([first, second]);

        expect(run).toHaveBeenCalledTimes(1);
    });

    it("hands each ref to the transport on its own", async () => {
        const { queue, calls } = setup();

        await Promise.all([queue.enqueue("acquire", map("Quicksilver")), queue.enqueue("acquire", map("Supreme Isthmus"))]);

        expect(calls).toEqual([
            { operation: "acquire", type: "map", ids: ["Quicksilver"] },
            { operation: "acquire", type: "map", ids: ["Supreme Isthmus"] },
        ]);
    });

    it("runs several at once without exceeding the limit", async () => {
        let running = 0;
        let peak = 0;
        const gate = deferred();
        const { queue } = setup({
            run: async () => {
                running++;
                peak = Math.max(peak, running);
                await gate.settled;
                running--;
            },
        });

        const ids = Array.from({ length: MAX_CONCURRENT_DOWNLOADS + 4 }, (_, index) => `map-${index}`);
        const all = Promise.all(ids.map((id) => queue.enqueue("acquire", map(id))));
        await Promise.resolve();

        gate.release();
        await all;

        expect(peak).toBe(MAX_CONCURRENT_DOWNLOADS);
    });

    it("picks up remaining work as earlier downloads finish", async () => {
        const { queue, calls } = setup();

        const ids = Array.from({ length: MAX_CONCURRENT_DOWNLOADS + 4 }, (_, index) => `map-${index}`);
        await Promise.all(ids.map((id) => queue.enqueue("acquire", map(id))));

        expect(calls).toHaveLength(ids.length);
    });

    // Also guards the ordering inside work(): if it stopped claiming the ref before its first await, a
    // second worker would pick the other operation up and the two would interleave.
    it("does not overlap an acquisition and a removal of the same ref", async () => {
        const observed: string[] = [];
        const { queue } = setup({
            run: async ({ operation, ids }) => {
                observed.push(`start ${operation} ${ids[0]}`);
                await Promise.resolve();
                observed.push(`end ${operation} ${ids[0]}`);
            },
        });

        const acquired = queue.enqueue("acquire", map("Quicksilver"));
        const removed = queue.enqueue("remove", map("Quicksilver"));

        await Promise.all([acquired, removed]);

        expect(observed).toEqual(["start acquire Quicksilver", "end acquire Quicksilver", "start remove Quicksilver", "end remove Quicksilver"]);
    });

    it("settles by what actually landed rather than the transport's result", async () => {
        const present = new Set<string>();
        const queue = new ContentQueue(
            async (_operation, type, ids) => {
                present.add(`${type}:${ids[0]}`);
                throw new Error("prd exited 1");
            },
            (ref) => present.has(`${ref.type}:${ref.id}`)
        );

        await expect(queue.enqueue("acquire", map("landed anyway"))).resolves.toBeUndefined();
    });

    it("rejects when the transport succeeds but the content is not there", async () => {
        const silent = new ContentQueue(
            async () => {},
            () => false
        );

        await expect(silent.enqueue("acquire", map("Quicksilver"))).rejects.toThrow("still missing");
    });

    it("rejects a removal that left the content installed", async () => {
        const stubborn = new ContentQueue(
            async () => {},
            () => true
        );

        await expect(stubborn.enqueue("remove", map("Quicksilver"))).rejects.toThrow("still installed");
    });

    it("removes a ref and resolves once it is gone", async () => {
        const { queue, calls, present } = setup({ present: new Set(["map:Quicksilver"]) });

        await queue.enqueue("remove", map("Quicksilver"));

        expect(calls).toEqual([{ operation: "remove", type: "map", ids: ["Quicksilver"] }]);
        expect(present.has("map:Quicksilver")).toBe(false);
    });

    it("reports queued and running entries while work is outstanding", async () => {
        const gate = deferred();
        const { queue } = setup({ run: () => gate.settled });
        const snapshots: string[][] = [];
        queue.onChanged.add((entries) => snapshots.push(entries.map((entry) => `${entry.id}:${entry.operation}:${entry.status}`)));

        const ids = Array.from({ length: MAX_CONCURRENT_DOWNLOADS + 1 }, (_, index) => `map-${index}`);
        const all = Promise.all(ids.map((id) => queue.enqueue("acquire", map(id))));
        await Promise.resolve();

        const latest = snapshots.at(-1) ?? [];
        expect(latest.filter((entry) => entry.endsWith(":running"))).toHaveLength(MAX_CONCURRENT_DOWNLOADS);
        expect(latest.filter((entry) => entry.endsWith(":queued"))).toHaveLength(1);

        gate.release();
        await all;

        expect(queue.snapshot()).toEqual([]);
    });
});
