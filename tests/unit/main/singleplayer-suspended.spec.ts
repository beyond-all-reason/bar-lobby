// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    adoptEngineSave,
    deleteAllSuspendedMissions,
    deleteSuspendedMission,
    type MissionLaunchRecord,
    readSuspendedMission,
    readSuspendedMissions,
    suspendedSavePath,
} from "@main/content/singleplayer/suspended-missions";
import { saveFileName } from "@main/content/singleplayer/saves";
import { encodeModoptionValue } from "@shared/startbox-modoptions";
import { fakeEngineSave } from "./fake-engine-save";

let root: string;
let engineSaves: string;
let dir: string;

beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "bar-suspended-"));
    engineSaves = path.join(root, "data", "Saves");
    dir = path.join(root, "saves", "local", "missions");
    await fs.mkdir(engineSaves, { recursive: true });
});

afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
});

const campaign = { kind: "campaign" as const, source: "official" as const, rootId: "official", id: "cortex01" };

const launch = (overrides: Partial<MissionLaunchRecord> = {}): MissionLaunchRecord => ({
    item: campaign,
    missionId: "CM02",
    entryPoint: "campaigns/cortex01/CM02/mission.lua",
    engineVersion: "2026.11.04",
    gameVersion: "Beyond All Reason test-31820-45ea098",
    archiveName: "bar-campaign-cortex01 9.0",
    archiveSha256: "a".repeat(64),
    saveVersion: 1,
    startedAt: Date.now() - 60_000,
    ...overrides,
});

async function script({ archiveName = "bar-campaign-cortex01 9.0", entryPoint = "campaigns/cortex01/CM02/mission.lua", playerName = "Commander" } = {}) {
    const options = await encodeModoptionValue({ entryPoint, difficulty: "Medium" });
    return `[game]\n{\n\t[modoptions]\n\t{\n\t\tmissionoptions=${options};\n\t}\n\tgametype=${archiveName};\n\tmapname=CM02 v2;\n\tmyplayername=${playerName};\n}\n`;
}

// An engine save as the player would make one in game, written `ageMs` ago, with BAR's .lua beside it.
async function engineSave(name: string, ageMs: number, { engineVersion = "2026.11.04", ...options }: { engineVersion?: string; archiveName?: string; entryPoint?: string; playerName?: string } = {}) {
    const ssf = path.join(engineSaves, `${name}.ssf`);
    await fs.writeFile(ssf, fakeEngineSave(engineVersion, await script(options), "CM02 v2", 1024));
    await fs.writeFile(path.join(engineSaves, `${name}.lua`), "return {}");
    const time = new Date(Date.now() - ageMs);
    await fs.utimes(ssf, time, time);

    return ssf;
}

const engineSaveNames = async () => (await fs.readdir(engineSaves)).sort();

describe("adoptEngineSave", () => {
    it("keeps the newest save of the game as the item's suspended mission, and deletes the game's other saves", async () => {
        await engineSave("first", 30_000);
        const newest = await engineSave("second", 10_000);
        const contents = await fs.readFile(newest);

        const file = await adoptEngineSave(engineSaves, dir, launch());

        expect(file).toMatchObject({ formatVersion: 1, item: campaign, missionId: "CM02", playerName: "Commander", difficulty: "Medium", engineVersion: "2026.11.04", saveVersion: 1 });
        expect(await fs.readFile(suspendedSavePath(dir, "campaign", campaign))).toEqual(contents);
        expect(await readSuspendedMission(dir, "campaign", campaign)).toEqual(file);
        expect(await engineSaveNames()).toEqual([]);
    });

    it("leaves saves that aren't the game's: older than the launch, of another mission or archive, or another engine's", async () => {
        await engineSave("before-launch", 120_000);
        await engineSave("other-mission", 10_000, { entryPoint: "campaigns/cortex01/CM01/mission.lua" });
        await engineSave("other-archive", 10_000, { archiveName: "bar-campaign-other 1.0" });
        await engineSave("other-engine", 10_000, { engineVersion: "2026.11.02" });
        await fs.writeFile(path.join(engineSaves, "broken.ssf"), "not a save");

        expect(await adoptEngineSave(engineSaves, dir, launch())).toBeUndefined();
        expect(await engineSaveNames()).toHaveLength(9);
    });

    it("keeps a save whose file time trails the launch by a little", async () => {
        await engineSave("stamped-early", 1_000);

        expect(await adoptEngineSave(engineSaves, dir, launch({ startedAt: Date.now() }))).toMatchObject({ missionId: "CM02" });
    });

    it("keeps the suspended mission the item had when the game made no save", async () => {
        await engineSave("kept", 10_000);
        await adoptEngineSave(engineSaves, dir, launch());

        expect(await adoptEngineSave(engineSaves, dir, launch({ startedAt: Date.now() }))).toBeUndefined();
        expect(await readSuspendedMission(dir, "campaign", campaign)).toMatchObject({ missionId: "CM02" });
    });

    it("replaces the item's suspended mission with a later one", async () => {
        await engineSave("old", 10_000);
        await adoptEngineSave(engineSaves, dir, launch());
        const later = await engineSave("later", 1_000, { playerName: "Renamed" });
        const contents = await fs.readFile(later);

        expect(await adoptEngineSave(engineSaves, dir, launch({ startedAt: Date.now() - 5_000 }))).toMatchObject({ playerName: "Renamed" });
        expect(await fs.readFile(suspendedSavePath(dir, "campaign", campaign))).toEqual(contents);
    });

    it("gives nothing when the engine has written no saves at all", async () => {
        await fs.rm(engineSaves, { recursive: true });

        expect(await adoptEngineSave(engineSaves, dir, launch())).toBeUndefined();
    });
});

describe("reading and deleting suspended missions", () => {
    const jsonPath = () => path.join(dir, saveFileName("campaign", campaign));

    beforeEach(async () => {
        await engineSave("kept", 10_000);
        await adoptEngineSave(engineSaves, dir, launch());
    });

    it("lists every usable one", async () => {
        expect((await readSuspendedMissions(dir)).files).toEqual([expect.objectContaining({ item: campaign, missionId: "CM02" })]);
    });

    it("reports one whose engine save is missing, or from a newer client, and doesn't use it", async () => {
        await fs.rm(suspendedSavePath(dir, "campaign", campaign));
        expect(await readSuspendedMissions(dir)).toEqual({ files: [], problems: [expect.objectContaining({ message: "Its engine save is missing" })] });

        await fs.writeFile(suspendedSavePath(dir, "campaign", campaign), "x");
        const file = JSON.parse(await fs.readFile(jsonPath(), "utf8"));
        await fs.writeFile(jsonPath(), JSON.stringify({ ...file, formatVersion: 2 }));
        expect((await readSuspendedMissions(dir)).problems).toEqual([expect.objectContaining({ message: expect.stringMatching(/newer client/) })]);
        expect(await readSuspendedMission(dir, "campaign", campaign)).toBeUndefined();
    });

    it("deletes one, saying whether there was one", async () => {
        expect(await deleteSuspendedMission(dir, "campaign", campaign)).toBe(true);
        expect(await fs.readdir(dir)).toEqual([]);
        expect(await deleteSuspendedMission(dir, "campaign", campaign)).toBe(false);
    });

    it("deletes all of them, unreadable ones included, telling of each readable one", async () => {
        await fs.writeFile(path.join(dir, "scenario-broken.json"), "{ not json");
        const onDeleted = vi.fn();

        await deleteAllSuspendedMissions(dir, onDeleted);

        expect(onDeleted).toHaveBeenCalledWith(campaign);
        expect(await fs.readdir(dir)).toEqual([]);
    });
});
