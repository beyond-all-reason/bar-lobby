// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deleteAllSaves, deleteSave, readSave, readSaves, recordResult as recordWith, saveFileName } from "@main/content/singleplayer/saves";
import { applyResult } from "@shared/content/campaign-progress";
import { type ReportedResult, SAVE_LIMITS } from "@shared/content/save";
import type { CampaignConfig } from "@shared/content/schema/campaign-config";
import type { SingleplayerKind } from "@shared/content/singleplayer";
import sampleCampaign from "../../fixtures/content/campaigns/sample-campaign/campaignConfig.json";
import type { SingleplayerItemRef } from "@shared/content/singleplayer";

const official: SingleplayerItemRef = { source: "official", rootId: "official", id: "sample-campaign" };
const custom: SingleplayerItemRef = { source: "custom", rootId: "custom", id: "sample-campaign" };

// The service applies a campaign's own rules to its results, so these tests do too, with the sample campaign's.
const recordResult = (dir: string, kind: SingleplayerKind, ref: SingleplayerItemRef, result: ReportedResult, saveVersion = 1) =>
    kind === "campaign"
        ? recordWith(dir, kind, ref, result, saveVersion, (progress, reported) => applyResult(sampleCampaign as CampaignConfig, progress, reported))
        : recordWith(dir, kind, ref, result, saveVersion);

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
        expect(save).toMatchObject({
            formatVersion: 1,
            item: { kind: "campaign", ...official },
            plays: { mission01: { victories: 1, failures: 0 } },
            campaign: { unlocked: ["mission01", "mission02"], removed: ["tutorial"], prerequisitesMet: [], variables: {} },
            recent: [{ missionId: "mission01", outcome: "victory" }],
        });
        expect(Date.parse(save.recent[0].at)).not.toBeNaN();
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

        const save = await readSave(dir, "campaign", official);
        expect(save?.recent.map((result) => result.missionId)).toEqual(["mission01", "mission02", "missionA"]);
        expect(Object.keys(save?.plays ?? {})).toEqual(["mission01", "mission02", "missionA"]);
    });

    it("keeps fields it doesn't know when adding a result", async () => {
        await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" });
        const file = fileOf(saveFileName("campaign", official));
        const written = JSON.parse(await fs.readFile(file, "utf8"));
        written.newerField = { kept: true };
        written.recent[0].players = 2;
        await fs.writeFile(file, JSON.stringify(written));

        const save = await recordResult(dir, "campaign", official, { missionId: "mission02", outcome: "failure" });

        expect(save).toMatchObject({ newerField: { kept: true }, recent: [{ players: 2 }, { missionId: "mission02" }] });
        expect(JSON.parse(await fs.readFile(file, "utf8"))).toEqual(save);
    });

    it("saves the campaign's merged variables, and the reported ones in the recent results", async () => {
        await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory", variables: { gone: "soon" } });
        const save = await recordResult(dir, "campaign", official, { missionId: "mission02", outcome: "failure", variables: { lives: 2, hero: "alice", veteran: true, gone: null } });

        expect(save.campaign?.variables).toEqual({ lives: 2, hero: "alice", veteran: true });
        expect(save.recent[1].variables).toEqual({ lives: 2, hero: "alice", veteran: true, gone: null });
    });

    it("keeps only the latest results, and a scenario's plays as counts", async () => {
        for (let i = 0; i < SAVE_LIMITS.recentResults + 5; i++) {
            await recordResult(dir, "scenario", custom, { missionId: custom.id, outcome: i % 2 === 0 ? "victory" : "failure" });
        }
        const save = await readSave(dir, "scenario", custom);

        expect(save?.recent).toHaveLength(SAVE_LIMITS.recentResults);
        expect(save?.plays).toEqual({ [custom.id]: { victories: 13, failures: 12 } });
        expect(save?.campaign).toBeUndefined();
    });

    describe("save versions", () => {
        it("records the content's save version on a new save", async () => {
            expect((await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" })).saveVersion).toBe(1);
            expect((await recordResult(dir, "campaign", custom, { missionId: "mission01", outcome: "victory" }, 2)).saveVersion).toBe(2);
        });

        it("refuses a result for a save started under another version, and leaves it alone", async () => {
            await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" }, 2);
            const file = fileOf(saveFileName("campaign", official));
            const before = await fs.readFile(file, "utf8");

            await expect(recordResult(dir, "campaign", official, { missionId: "mission02", outcome: "victory" }, 3)).rejects.toThrow(
                expect.objectContaining({ reason: "save_version_older", message: expect.stringMatching(/Start over/) })
            );
            await expect(recordResult(dir, "campaign", official, { missionId: "mission02", outcome: "victory" }, 1)).rejects.toThrow(
                expect.objectContaining({ reason: "save_version_newer", message: expect.stringMatching(/newer than the 1 installed/) })
            );

            expect(await fs.readFile(file, "utf8")).toBe(before);
        });

        it("starts a save at the new version once the old one is deleted", async () => {
            await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" });
            await deleteSave(dir, "campaign", official);

            const save = await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" }, 2);

            expect(save).toMatchObject({ saveVersion: 2, plays: { mission01: { victories: 1, failures: 0 } } });
        });
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
            ["a schema violation", (file) => fs.writeFile(file, JSON.stringify({ formatVersion: 1, item: { kind: "campaign", ...official }, plays: "lots", recent: [] })), /plays/],
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
            await expect(recordResult(dir, "campaign", official, { missionId: "mission02", outcome: "victory" })).rejects.toThrow(
                expect.objectContaining({ reason: "save_unusable", message: expect.stringMatching(/Delete the save/) })
            );

            expect(await fs.readFile(file, "utf8")).toBe(before);
        });

        it("is removed by deleting the save", async () => {
            await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" });
            await fs.writeFile(fileOf(saveFileName("campaign", official)), "{ half a save");

            await deleteSave(dir, "campaign", official);

            expect(await files()).toEqual([]);
            expect((await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" })).plays).toEqual({ mission01: { victories: 1, failures: 0 } });
        });
    });

    it("deletes one item's save only, and deleting a missing save does nothing", async () => {
        await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" });
        await recordResult(dir, "campaign", custom, { missionId: "mission01", outcome: "victory" });

        await deleteSave(dir, "campaign", official);
        await deleteSave(dir, "tutorial", official);

        expect(await files()).toEqual([saveFileName("campaign", custom)]);
    });

    it("deletes every save, unreadable ones and temp files too, and names the readable ones", async () => {
        await recordResult(dir, "campaign", official, { missionId: "mission01", outcome: "victory" });
        await recordResult(dir, "tutorial", custom, { missionId: "sample-campaign", outcome: "victory" });
        await fs.writeFile(fileOf("campaign-0123456789abcdef0123456789abcdef.json"), "{ half a save");
        await fs.writeFile(fileOf(`${saveFileName("scenario", custom)}.tmp`), "{ half");
        await fs.writeFile(fileOf("notes.txt"), "kept");

        const deleted = await deleteAllSaves(dir);

        expect(deleted).toEqual(
            expect.arrayContaining([
                { kind: "campaign", ...official },
                { kind: "tutorial", ...custom },
            ])
        );
        expect(deleted).toHaveLength(2);
        expect(await files()).toEqual(["notes.txt"]);
    });

    it("deletes nothing when there are no saves", async () => {
        expect(await deleteAllSaves(dir)).toEqual([]);
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
            await expect(record({ "": 1 })).rejects.toThrow(expect.objectContaining({ reason: "invalid_result", message: expect.stringMatching(/Invalid result/) }));
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

            await expect(record({ extra: 1 })).rejects.toThrow(expect.objectContaining({ reason: "invalid_result", message: expect.stringMatching(/more than the 256 allowed/) }));
            expect(await files()).toHaveLength(1);
            expect((await readSave(dir, "campaign", official))?.recent).toHaveLength(2);
        });
    });
});
