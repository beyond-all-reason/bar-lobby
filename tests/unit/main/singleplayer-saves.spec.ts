// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deleteSave, readSave, readSaves, recordResult, saveFileName } from "@main/content/singleplayer/saves";
import { SAVE_LIMITS } from "@shared/content/save";
import type { SingleplayerItemRef } from "@shared/content/singleplayer";

const official: SingleplayerItemRef = { source: "official", rootId: "official", id: "sample-campaign" };
const custom: SingleplayerItemRef = { source: "custom", rootId: "custom", id: "sample-campaign" };

let dir: string;

beforeEach(async () => {
    dir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "bar-saves-")), "saves");
});

afterEach(async () => {
    await fs.rm(path.dirname(dir), { recursive: true, force: true });
});

const files = async () => (await fs.readdir(dir).catch(() => [])).sort();
const fileOf = (name: string) => path.join(dir, name);

describe("singleplayer saves", () => {
    it("writes nothing until the first result, then one file named by the item's hash", async () => {
        expect(await readSaves(dir)).toEqual({ saves: [], problems: [] });
        expect(await readSave(dir, "campaign", official)).toBeUndefined();

        const save = await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" });

        expect(await files()).toEqual([saveFileName("campaign", official)]);
        expect(saveFileName("campaign", official)).toMatch(/^campaign-[0-9a-f]{32}\.json$/);
        expect(save).toMatchObject({ formatVersion: 1, item: { kind: "campaign", ...official }, history: [{ missionId: "mission01", outcome: "victory" }] });
        expect(Date.parse(save.history[0].at!)).not.toBeNaN();
        expect(await readSave(dir, "campaign", official)).toEqual(save);
        expect((await readSaves(dir)).saves).toEqual([save]);
    });

    it("keeps items apart that share an id across kinds, sources and roots", async () => {
        const items = [
            ["campaign", official],
            ["campaign", custom],
            ["tutorial", official],
            ["campaign", { source: "custom", rootId: "123456", id: "sample-campaign" }],
        ] as const;
        for (const [kind, ref] of items) {
            await recordResult(dir, kind, ref, { missionId: "mission01", outcome: "victory" });
        }

        expect(await files()).toHaveLength(items.length);
        expect((await readSaves(dir)).saves.map((save) => save.item)).toHaveLength(items.length);
    });

    // Windows file names ignore case, and ids are folder names that may differ only in case on Linux.
    it("gives ids that differ only in case different file names", () => {
        const lower = saveFileName("campaign", { ...custom, id: "campaign" });
        const upper = saveFileName("campaign", { ...custom, id: "Campaign" });

        expect(lower).not.toBe(upper);
        expect([lower, upper].map((name) => name.toLowerCase())).toEqual([lower, upper]);
    });

    it("keeps results recorded close together, in order", async () => {
        await Promise.all(["mission01", "mission02", "missionA"].map((missionId) => recordResult(dir, "campaign", official, { missionId, outcome: "victory" })));

        expect((await readSave(dir, "campaign", official))?.history.map((result) => result.missionId)).toEqual(["mission01", "mission02", "missionA"]);
    });

    it("keeps fields it doesn't know when adding a result", async () => {
        await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" });
        const file = fileOf(saveFileName("campaign", official));
        const written = JSON.parse(await fs.readFile(file, "utf8"));
        written.newerField = { kept: true };
        written.history[0].players = 2;
        await fs.writeFile(file, JSON.stringify(written));

        const save = await recordResult(dir, "campaign", official, { missionId: "mission02", outcome: "failure" });

        expect(save).toMatchObject({ newerField: { kept: true }, history: [{ players: 2 }, { missionId: "mission02" }] });
        expect(JSON.parse(await fs.readFile(file, "utf8"))).toEqual(save);
    });

    it("saves variables with the result", async () => {
        const save = await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "failure", variables: { lives: 2, hero: "alice", veteran: true, gone: null } });

        expect(save.history[0].variables).toEqual({ lives: 2, hero: "alice", veteran: true, gone: null });
    });

    describe("a save this client can't use", () => {
        const cases: [string, (file: string) => Promise<void>, RegExp][] = [
            [
                "a newer format version",
                async (file) => {
                    const written = JSON.parse(await fs.readFile(file, "utf8"));
                    await fs.writeFile(file, JSON.stringify({ ...written, formatVersion: 99 }));
                },
                /newer client/,
            ],
            ["bad JSON", (file) => fs.writeFile(file, "{ half a save"), /Not valid JSON/],
            [
                "another item's save",
                async (file) => {
                    const written = JSON.parse(await fs.readFile(file, "utf8"));
                    await fs.writeFile(file, JSON.stringify({ ...written, item: { ...written.item, source: "custom", rootId: "custom" } }));
                },
                /belongs in another file/,
            ],
            ["a schema violation", (file) => fs.writeFile(file, JSON.stringify({ formatVersion: 1, item: { kind: "campaign", ...official }, history: "lots" })), /history/],
        ];

        it.each(cases)("is reported, left alone and not added to: %s", async (_, spoil, message) => {
            await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" });
            const file = fileOf(saveFileName("campaign", official));
            await spoil(file);
            const before = await fs.readFile(file, "utf8");

            const read = await readSaves(dir);
            expect(read.saves).toEqual([]);
            expect(read.problems).toEqual([{ path: file, severity: "error", message: expect.stringMatching(message) }]);
            await expect(readSave(dir, "campaign", official)).rejects.toThrow(message);
            await expect(recordResult(dir, "campaign", official, { missionId: "mission02", outcome: "victory" })).rejects.toThrow(/Delete the save/);

            expect(await fs.readFile(file, "utf8")).toBe(before);
        });

        it("is removed by deleting the save", async () => {
            await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" });
            await fs.writeFile(fileOf(saveFileName("campaign", official)), "{ half a save");

            await deleteSave(dir, "campaign", official);

            expect(await files()).toEqual([]);
            expect((await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" })).history).toHaveLength(1);
        });
    });

    it("deletes one item's save only, and deleting a missing save does nothing", async () => {
        await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" });
        await recordResult(dir, "campaign", custom, { missionId: "mission01", outcome: "victory" });

        await deleteSave(dir, "campaign", official);
        await deleteSave(dir, "tutorial", official);

        expect(await files()).toEqual([saveFileName("campaign", custom)]);
    });

    it("ignores files that aren't saves", async () => {
        await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" });
        await fs.writeFile(fileOf("notes.txt"), "hello");
        await fs.writeFile(fileOf(`${saveFileName("campaign", custom)}.tmp`), "{ half");

        expect(await readSaves(dir)).toMatchObject({ saves: [{ item: official }], problems: [] });
    });

    describe("variable limits", () => {
        const record = (variables: Record<string, unknown>) => recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory", variables } as never);

        it("refuses a key that is empty or too long", async () => {
            await expect(record({ "": 1 })).rejects.toThrow(/Invalid result/);
            await expect(record({ ["k".repeat(SAVE_LIMITS.variableKeyLength + 1)]: 1 })).rejects.toThrow(/Invalid result/);
        });

        it("refuses a string that is too long, or a value that isn't a string, number or boolean", async () => {
            await expect(record({ story: "s".repeat(SAVE_LIMITS.variableStringLength + 1) })).rejects.toThrow(/Invalid result/);
            await expect(record({ list: [1, 2] })).rejects.toThrow(/Invalid result/);
            await expect(record({ nothing: Number.NaN })).rejects.toThrow(/Invalid result/);
        });

        it("refuses more variables than allowed, counted after merging", async () => {
            const many = (from: number, count: number) => Object.fromEntries(Array.from({ length: count }, (_, i) => [`v${from + i}`, i]));
            await record(many(0, SAVE_LIMITS.variableCount));
            // Replacing a saved key doesn't add to the count.
            await record({ v0: "again" });

            await expect(record({ extra: 1 })).rejects.toThrow(/more than the 256 allowed/);
            expect(await files()).toHaveLength(1);
            expect((await readSave(dir, "campaign", official))?.history).toHaveLength(2);
        });
    });
});
