// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyResult, countPlay } from "@shared/content/campaign-progress";
import { saveKey, type SaveChange, type ReportedResult, type SingleplayerSave } from "@shared/content/save";
import type { CampaignConfig } from "@shared/content/schema/campaign-config";
import type { SingleplayerCampaign, SingleplayerContent, SingleplayerItemRef, SingleplayerKind, SingleplayerScenario } from "@shared/content/singleplayer";
import sampleCampaign from "../../fixtures/content/campaigns/sample-campaign/campaignConfig.json";

const api = vi.hoisted(() => ({ list: vi.fn(), getSaves: vi.fn(), recordResult: vi.fn(), deleteSave: vi.fn(), deleteAllSaves: vi.fn(), onSaveChanged: vi.fn() }));
vi.mock("@renderer/api/singleplayer", () => ({ singleplayerApi: api }));

const { singleplayerStore, singleplayerUpdates } = await import("@renderer/store/singleplayer.store");
const { initSingleplayerLogic, singleplayerLogic } = await import("@renderer/logic/singleplayer");

// Stands in for main, which keeps the saves, applies each result under the item's rules and returns the save
// as written. Every campaign here is the sample campaign.
const disk = new Map<string, SingleplayerSave>();

// How many plays of one item, or of one campaign's missions, the save holds.
const playsOf = (kind: SingleplayerKind, ref: SingleplayerItemRef) =>
    Object.values(singleplayerStore.saves.get(saveKey(kind, ref))?.plays ?? {}).reduce((total, plays) => total + plays.victories + plays.failures, 0);

function fakeMain() {
    disk.clear();
    api.list.mockResolvedValue(content([]));
    api.getSaves.mockImplementation(async () => ({ saves: structuredClone([...disk.values()]), problems: [] }));
    api.recordResult.mockImplementation(async (kind: SingleplayerKind, ref: SingleplayerItemRef, result: ReportedResult) => {
        const key = saveKey(kind, ref);
        const save = disk.get(key) ?? { formatVersion: 1, item: { kind, source: ref.source, rootId: ref.rootId, id: ref.id }, plays: {}, recent: [] };
        const progress = kind === "campaign" ? applyResult(sampleCampaign as CampaignConfig, save, result) : { plays: countPlay(save.plays, result.missionId, result.outcome) };
        const updated = { ...save, ...progress };
        disk.set(key, updated);
        return structuredClone(updated);
    });
    api.deleteSave.mockImplementation(async (kind: SingleplayerKind, ref: SingleplayerItemRef) => {
        disk.delete(saveKey(kind, ref));
    });
}

function makeCampaign(source: "official" | "custom"): SingleplayerCampaign {
    const config = sampleCampaign as CampaignConfig;

    return { kind: "campaign", source, rootId: source, id: "sample-campaign", path: "", config, credits: [], language: {}, compatibility: config.compatibility, missions: [] };
}

function makeTutorial(id: string, source: "official" | "custom" = "official"): SingleplayerScenario {
    return { kind: "tutorial", source, rootId: source, id, compatibility: [] } as unknown as SingleplayerScenario;
}

function content(tutorials: SingleplayerScenario[]): SingleplayerContent {
    return { campaigns: [], scenarios: [], tutorials, problems: [] };
}

const official = makeCampaign("official");
const custom = makeCampaign("custom");
const officialItem = { kind: "campaign", source: "official", rootId: "official", id: "sample-campaign" } as const;

async function winThroughToFinal(campaign: SingleplayerCampaign) {
    for (const missionId of ["mission01", "mission02", "missionA", "missionB"]) {
        await singleplayerLogic.recordCampaignResult(campaign, missionId, "victory");
    }
}

describe("singleplayer logic", () => {
    beforeEach(() => {
        singleplayerUpdates.clear();
        vi.resetAllMocks();
        fakeMain();
    });

    describe("loadContent", () => {
        it("puts the scanned content in the store", async () => {
            const scanned = content([]);
            api.list.mockResolvedValue(scanned);

            await singleplayerLogic.loadContent();

            expect(singleplayerStore.content).toEqual(scanned);
            expect(singleplayerStore.isLoading).toBe(false);
            expect(singleplayerStore.loadError).toBeUndefined();
        });

        it("records a failed scan without throwing", async () => {
            api.list.mockRejectedValue(new Error("singleplayer:list failed: boom"));

            await singleplayerLogic.loadContent();

            expect(singleplayerStore.loadError).toBe("singleplayer:list failed: boom");
            expect(singleplayerStore.isLoading).toBe(false);
        });

        it("loads the saves written before, once", async () => {
            await singleplayerLogic.recordCampaignResult(official, "mission01", "victory");
            singleplayerUpdates.clear();

            await singleplayerLogic.loadContent();
            await singleplayerLogic.loadContent();

            expect(singleplayerLogic.campaignState(official).completed).toEqual(["mission01"]);
            expect(api.getSaves).toHaveBeenCalledTimes(1);
        });

        it("shows the content when the saves can't be read, and tries them again next time", async () => {
            api.getSaves.mockRejectedValueOnce(new Error("singleplayer:getSaves failed: boom"));

            await singleplayerLogic.loadContent();

            expect(singleplayerStore.content).toBeDefined();
            expect(singleplayerStore.loadError).toBeUndefined();
            expect(singleplayerStore.saveError).toBe("singleplayer:getSaves failed: boom");

            await singleplayerLogic.loadContent();
            expect(api.getSaves).toHaveBeenCalledTimes(2);
            expect(singleplayerStore.savesLoaded).toBe(true);
        });

        it("keeps results recorded before a rescan", async () => {
            await singleplayerLogic.recordCampaignResult(official, "mission01", "victory");

            await singleplayerLogic.loadContent();

            expect(singleplayerLogic.campaignState(official).completed).toEqual(["mission01"]);
        });
    });

    describe("campaign results", () => {
        it("moves the campaign on as results are recorded", async () => {
            const { state, finishedNow } = await singleplayerLogic.recordCampaignResult(official, "mission01", "victory");

            expect(state.available).toEqual(["mission02"]);
            expect(state.removed).toEqual(["tutorial"]);
            expect(finishedNow).toBe(false);
        });

        it("saves each result through main", async () => {
            await singleplayerLogic.recordCampaignResult(official, "mission01", "failure", { lives: 2 });

            expect(api.recordResult).toHaveBeenCalledWith("campaign", official, { missionId: "mission01", outcome: "failure", variables: { lives: 2 } });
        });

        it("completes the campaign on winning a final mission, and says so only once", async () => {
            await winThroughToFinal(official);

            expect((await singleplayerLogic.recordCampaignResult(official, "finalMission", "victory")).finishedNow).toBe(true);
            expect(singleplayerLogic.campaignCompleted(official)).toBe(true);
            expect((await singleplayerLogic.recordCampaignResult(official, "optionalMissionA", "victory")).finishedNow).toBe(false);
        });

        it("leaves the state as it was when a result can't be saved", async () => {
            api.recordResult.mockRejectedValueOnce(new Error("singleplayer:recordResult failed: saved by a newer client"));

            const { state, finishedNow } = await singleplayerLogic.recordCampaignResult(official, "mission01", "victory");

            expect(state.completed).toEqual([]);
            expect(finishedNow).toBe(false);
            expect(singleplayerStore.saveError).toBe("singleplayer:recordResult failed: saved by a newer client");

            await singleplayerLogic.recordCampaignResult(official, "mission01", "victory");
            expect(singleplayerStore.saveError).toBeUndefined();
        });

        it("gives the variables the campaign's missions have reported", async () => {
            await singleplayerLogic.recordCampaignResult(official, "mission01", "victory", { lives: 3, hero: "alice" });
            await singleplayerLogic.recordCampaignResult(official, "mission02", "failure", { lives: null, gold: 10 });

            expect(singleplayerLogic.variablesOf(official)).toEqual({ hero: "alice", gold: 10 });
            expect(singleplayerLogic.variablesOf(custom)).toEqual({});
        });

        it("keeps official and custom campaigns with the same id apart", async () => {
            await singleplayerLogic.recordCampaignResult(official, "mission01", "victory");

            expect(singleplayerLogic.campaignState(custom).completed).toEqual([]);
        });

        it("deletes one campaign's save only", async () => {
            await singleplayerLogic.recordCampaignResult(official, "mission01", "victory");
            await singleplayerLogic.recordCampaignResult(custom, "mission01", "victory");

            await singleplayerLogic.deleteSave("campaign", official);

            expect(api.deleteSave).toHaveBeenCalledWith("campaign", official);
            expect(playsOf("campaign", official)).toBe(0);
            expect(playsOf("campaign", custom)).toBe(1);
        });

        it("keeps a save that failed to delete", async () => {
            await singleplayerLogic.recordCampaignResult(official, "mission01", "victory");
            api.deleteSave.mockRejectedValueOnce(new Error("singleplayer:deleteSave failed: busy"));

            await singleplayerLogic.deleteSave("campaign", official);

            expect(playsOf("campaign", official)).toBe(1);
            expect(singleplayerStore.saveError).toBe("singleplayer:deleteSave failed: busy");
        });
    });

    describe("save versions", () => {
        const updated: SingleplayerCampaign = { ...official, config: { ...official.config, saveVersion: 2 } };

        it("counts a save from an older version as no progress until it is started over", async () => {
            await singleplayerLogic.recordCampaignResult(official, "mission01", "victory", { lives: 3 });

            expect(singleplayerLogic.campaignSaveCompatibility(updated)).toBe("older");
            expect(singleplayerLogic.campaignState(updated).completed).toEqual([]);
            expect(singleplayerLogic.variablesOf(updated)).toEqual({});

            await singleplayerLogic.deleteSave("campaign", updated);
            expect(singleplayerLogic.campaignSaveCompatibility(updated)).toBe("compatible");
        });

        it("leaves a save from a newer version unused", () => {
            singleplayerUpdates.saveStored(saveKey("campaign", official), { formatVersion: 1, saveVersion: 2, item: officialItem, plays: { mission01: { victories: 1, failures: 0 } }, recent: [] });

            expect(singleplayerLogic.campaignSaveCompatibility(official)).toBe("newer");
            expect(singleplayerLogic.campaignState(official).completed).toEqual([]);
            expect(singleplayerLogic.campaignSaveCompatibility(updated)).toBe("compatible");
        });

        it("counts a campaign without a save as compatible", () => {
            expect(singleplayerLogic.campaignSaveCompatibility(updated)).toBe("compatible");
        });
    });

    describe("deleteAllSaves", () => {
        it("clears every save and an earlier error", async () => {
            await singleplayerLogic.recordCampaignResult(official, "mission01", "victory");
            await singleplayerLogic.recordItemResult(makeTutorial("basics"), "victory");
            singleplayerUpdates.saveFailed("singleplayer:recordResult failed: boom");

            expect(await singleplayerLogic.deleteAllSaves()).toBe(true);

            expect(api.deleteAllSaves).toHaveBeenCalled();
            expect(singleplayerStore.saves.size).toBe(0);
            expect(singleplayerStore.saveError).toBeUndefined();
        });

        it("keeps the saves and gives the reason when it fails", async () => {
            await singleplayerLogic.recordCampaignResult(official, "mission01", "victory");
            api.deleteAllSaves.mockRejectedValueOnce(new Error("singleplayer:deleteAllSaves failed: busy"));

            expect(await singleplayerLogic.deleteAllSaves()).toBe(false);

            expect(playsOf("campaign", official)).toBe(1);
            expect(singleplayerStore.saveError).toBe("singleplayer:deleteAllSaves failed: busy");
        });
    });

    describe("save changes from main", () => {
        // Subscribed once for the whole file, the same as at startup, so the handler is caught here.
        // Gives the change's turn in the queue of changes to the saves, so a test can wait for it.
        let reportChange: (change: SaveChange) => unknown;

        beforeEach(() => {
            api.onSaveChanged.mockImplementation((handler) => (reportChange = handler));
            initSingleplayerLogic();
        });

        const recordedByMain: SingleplayerSave = {
            formatVersion: 1,
            item: officialItem,
            plays: { mission01: { victories: 1, failures: 0 } },
            campaign: { unlocked: ["mission01", "mission02"], removed: ["tutorial"], prerequisitesMet: [], variables: { lives: 3 } },
            recent: [],
        };

        it("shows a result main recorded without being asked from here", async () => {
            await reportChange({ item: recordedByMain.item, save: recordedByMain });

            expect(singleplayerLogic.campaignState(official).completed).toEqual(["mission01"]);
            expect(singleplayerLogic.variablesOf(official)).toEqual({ lives: 3 });
            expect(singleplayerLogic.campaignState(custom).completed).toEqual([]);
        });

        it("drops a save main deleted, and leaves an error from this window alone", async () => {
            await singleplayerLogic.recordCampaignResult(official, "mission01", "victory");
            singleplayerUpdates.saveFailed("singleplayer:recordResult failed: boom");

            await reportChange({ item: officialItem, save: undefined });

            expect(playsOf("campaign", official)).toBe(0);
            expect(singleplayerStore.saveError).toBe("singleplayer:recordResult failed: boom");
        });

        it("applies a change that arrives while the saves load after them, so the load can't overwrite it", async () => {
            let answer!: (saves: { saves: SingleplayerSave[]; problems: [] }) => void;
            api.getSaves.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));

            const loading = singleplayerLogic.loadContent();
            const change = reportChange({ item: recordedByMain.item, save: recordedByMain });
            // Main read the folder before it wrote the change.
            answer({ saves: [], problems: [] });
            await Promise.all([loading, change]);

            expect(singleplayerLogic.campaignState(official).completed).toEqual(["mission01"]);
        });

        it("applies changes in the order they arrive", async () => {
            const lost = { ...recordedByMain, plays: { mission01: { victories: 0, failures: 1 } } };

            await Promise.all([reportChange({ item: officialItem, save: lost }), reportChange({ item: officialItem, save: recordedByMain })]);

            expect(singleplayerLogic.campaignState(official).completed).toEqual(["mission01"]);
        });
    });

    describe("tutorials", () => {
        it("completes a tutorial on a win but not on a loss", async () => {
            const tutorial = makeTutorial("basics");

            await singleplayerLogic.recordItemResult(tutorial, "failure");
            expect(singleplayerLogic.itemCompleted(tutorial)).toBe(false);

            await singleplayerLogic.recordItemResult(tutorial, "victory");
            expect(singleplayerLogic.itemCompleted(tutorial)).toBe(true);
        });

        it("completes a root's tutorials once every one of them is won", async () => {
            const [first, second, other] = [makeTutorial("first"), makeTutorial("second"), makeTutorial("first", "custom")];
            singleplayerUpdates.loaded(content([first, second, other]));

            await singleplayerLogic.recordItemResult(first, "victory");
            expect(singleplayerLogic.tutorialsCompleted("official", "official")).toBe(false);

            await singleplayerLogic.recordItemResult(second, "victory");
            expect(singleplayerLogic.tutorialsCompleted("official", "official")).toBe(true);
            expect(singleplayerLogic.tutorialsCompleted("custom", "custom")).toBe(false);
        });

        it("deletes the save of every tutorial in one root only", async () => {
            const [first, second, other] = [makeTutorial("first"), makeTutorial("second"), makeTutorial("first", "custom")];
            singleplayerUpdates.loaded(content([first, second, other]));
            for (const tutorial of [first, second, other]) {
                await singleplayerLogic.recordItemResult(tutorial, "victory");
            }

            await singleplayerLogic.deleteTutorialSaves("official", "official");

            expect(singleplayerLogic.itemCompleted(first)).toBe(false);
            expect(singleplayerLogic.itemCompleted(second)).toBe(false);
            expect(singleplayerLogic.itemCompleted(other)).toBe(true);
        });

        it("never counts a root without tutorials as completed", () => {
            singleplayerUpdates.loaded(content([]));

            expect(singleplayerLogic.tutorialsCompleted("official", "official")).toBe(false);
        });

        // A tutorial and a campaign in the same root may share an id.
        it("keeps a tutorial's results apart from a campaign with the same id", async () => {
            const tutorial = makeTutorial("sample-campaign");

            await singleplayerLogic.recordItemResult(tutorial, "victory");

            expect(playsOf("campaign", official)).toBe(0);
        });
    });
});
