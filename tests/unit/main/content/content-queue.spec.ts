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
const game = (id: string): ContentRef => ({ type: "game", id });
const engine = (id: string): ContentRef => ({ type: "engine", id });

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

    // One invocation is the only way pr-downloader fetches several assets at once, and the second one
    // would have had to wait for the first anyway.
    it("hands pr-downloader everything queued for it in one invocation", async () => {
        const { queue, calls } = setup();

        await Promise.all([queue.enqueue("acquire", map("Quicksilver")), queue.enqueue("acquire", map("Supreme Isthmus"))]);

        expect(calls).toEqual([{ operation: "acquire", type: "map", ids: ["Quicksilver", "Supreme Isthmus"] }]);
    });

    // Anything showing progress needs to know the set is one download before its first byte arrives, or
    // it briefly lists each ref on its own and then collapses them.
    it("names the invocation on every ref in it as soon as it starts", async () => {
        const gate = deferred();
        const { queue } = setup({ run: () => gate.settled });

        const all = Promise.all([queue.enqueue("acquire", map("Quicksilver")), queue.enqueue("acquire", map("Supreme Isthmus"))]);
        await Promise.resolve();

        const running = queue.snapshot().filter((entry) => entry.status === "running");
        expect(running).toHaveLength(2);
        expect(new Set(running.map((entry) => entry.transfer)).size).toBe(1);
        expect(running[0].transfer).toBeDefined();

        gate.release();
        await all;
    });

    // Each ref is its own invocation once the batch is abandoned, so anything showing progress has to
    // stop treating them as one download - otherwise it only ever shows whichever reported first.
    it("stops naming them one transfer once it retries them separately", async () => {
        const seen: Array<string | undefined> = [];
        const { queue } = setup({
            run: async ({ ids }) => {
                if (ids.length > 1) {
                    throw new Error("pr-downloader exited with code 1");
                }
                seen.push(queue.snapshot().find((entry) => entry.id === ids[0])?.transfer);
            },
        });

        await Promise.all([queue.enqueue("acquire", map("a")), queue.enqueue("acquire", map("b"))]);

        expect(seen).toHaveLength(2);
        expect(seen.every((transfer) => transfer === undefined)).toBe(true);
    });

    it("leaves a lone ref unnamed so it reads as itself", async () => {
        const gate = deferred();
        const { queue } = setup({ run: () => gate.settled });

        const acquiring = queue.enqueue("acquire", engine("2025.06.21"));
        await Promise.resolve();

        expect(queue.snapshot()[0].transfer).toBeUndefined();

        gate.release();
        await acquiring;
    });

    it("keeps engines on separate transfers", async () => {
        const { queue, calls } = setup();

        await Promise.all([queue.enqueue("acquire", engine("2025.06.21")), queue.enqueue("acquire", engine("2025.01.5"))]);

        expect(calls).toEqual([
            { operation: "acquire", type: "engine", ids: ["2025.06.21"] },
            { operation: "acquire", type: "engine", ids: ["2025.01.5"] },
        ]);
    });

    it("does not mix content types or directions into one invocation", async () => {
        const { queue, calls } = setup({ present: new Set(["map:Tangerine"]) });

        await Promise.all([queue.enqueue("acquire", map("Quicksilver")), queue.enqueue("acquire", game("byar:test")), queue.enqueue("remove", map("Tangerine"))]);

        expect(calls.every((call) => new Set(call.ids).size === call.ids.length)).toBe(true);
        expect(calls).toContainEqual({ operation: "acquire", type: "map", ids: ["Quicksilver"] });
        expect(calls).toContainEqual({ operation: "acquire", type: "game", ids: ["byar:test"] });
        expect(calls).toContainEqual({ operation: "remove", type: "map", ids: ["Tangerine"] });
    });

    // A batch spends one slot per ref, so batching cannot smuggle more past the limit than running them
    // one at a time would have.
    it("batches no more than the download limit allows", async () => {
        const { queue, calls } = setup();

        const ids = Array.from({ length: MAX_CONCURRENT_DOWNLOADS + 3 }, (_, index) => `map-${index}`);
        await Promise.all(ids.map((id) => queue.enqueue("acquire", map(id))));

        expect(Math.max(...calls.map((call) => call.ids.length))).toBe(MAX_CONCURRENT_DOWNLOADS);
        expect(calls.flatMap((call) => call.ids).sort()).toEqual([...ids].sort());
    });

    // pr-downloader gives up on the whole invocation when one asset cannot be resolved, so a batch that
    // fails says nothing about the assets that were merely along for the ride.
    it("retries a failed batch one at a time so a bad ref does not take the others down", async () => {
        const { queue, calls } = setup({
            run: async ({ ids }) => {
                if (ids.includes("Not A Map")) {
                    throw new Error("pr-downloader exited with code 1");
                }
            },
        });

        const good = queue.enqueue("acquire", map("Quicksilver"));
        const bad = queue.enqueue("acquire", map("Not A Map"));

        await expect(good).resolves.toBeUndefined();
        await expect(bad).rejects.toThrow();
        expect(calls).toEqual([
            { operation: "acquire", type: "map", ids: ["Quicksilver", "Not A Map"] },
            { operation: "acquire", type: "map", ids: ["Quicksilver"] },
            { operation: "acquire", type: "map", ids: ["Not A Map"] },
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

        const ids = Array.from({ length: MAX_CONCURRENT_DOWNLOADS + 4 }, (_, index) => `engine-${index}`);
        const all = Promise.all(ids.map((id) => queue.enqueue("acquire", engine(id))));
        await Promise.resolve();

        gate.release();
        await all;

        expect(peak).toBe(MAX_CONCURRENT_DOWNLOADS);
    });

    // pr-downloader keeps rapid's index files once under the assets path and refreshes them for maps as
    // well as games, so two of it at once can land on the same repos.gz and one loses.
    it("runs only one pr-downloader operation at a time", async () => {
        let running = 0;
        let peak = 0;
        const gate = deferred();
        const { queue } = setup({
            present: new Set(["game:byar:old"]),
            run: async () => {
                running++;
                peak = Math.max(peak, running);
                await gate.settled;
                running--;
            },
        });

        const all = Promise.all([
            queue.enqueue("acquire", game("byar:test")),
            queue.enqueue("acquire", map("Quicksilver")),
            queue.enqueue("acquire", map("Supreme Isthmus")),
            queue.enqueue("remove", game("byar:old")),
        ]);
        await Promise.resolve();

        gate.release();
        await all;

        expect(peak).toBe(1);
    });

    it("lets an engine download while pr-downloader is running", async () => {
        const started: string[] = [];
        const gate = deferred();
        const { queue } = setup({
            run: async ({ type, ids }) => {
                started.push(`${type}:${ids[0]}`);
                await gate.settled;
            },
        });

        const all = Promise.all([queue.enqueue("acquire", game("byar:test")), queue.enqueue("acquire", engine("2025.06.21"))]);
        await Promise.resolve();

        expect(started).toEqual(["game:byar:test", "engine:2025.06.21"]);

        gate.release();
        await all;
    });

    it("picks up remaining work as earlier downloads finish", async () => {
        const { queue, calls } = setup();

        const ids = Array.from({ length: MAX_CONCURRENT_DOWNLOADS + 4 }, (_, index) => `map-${index}`);
        await Promise.all(ids.map((id) => queue.enqueue("acquire", map(id))));

        expect(calls.flatMap((call) => call.ids).sort()).toEqual([...ids].sort());
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

        const ids = Array.from({ length: MAX_CONCURRENT_DOWNLOADS + 1 }, (_, index) => `engine-${index}`);
        const all = Promise.all(ids.map((id) => queue.enqueue("acquire", engine(id))));
        await Promise.resolve();

        const latest = snapshots.at(-1) ?? [];
        expect(latest.filter((entry) => entry.endsWith(":running"))).toHaveLength(MAX_CONCURRENT_DOWNLOADS);
        expect(latest.filter((entry) => entry.endsWith(":queued"))).toHaveLength(1);

        gate.release();
        await all;

        expect(queue.snapshot()).toEqual([]);
    });
});
