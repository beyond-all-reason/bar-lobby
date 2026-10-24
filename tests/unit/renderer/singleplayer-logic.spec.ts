// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveKey, type SaveChange, type SavedResult, type SingleplayerSave } from "@shared/content/save";
import type { CampaignConfig } from "@shared/content/schema/campaign-config";
import type { SingleplayerCampaign, SingleplayerContent, SingleplayerItemRef, SingleplayerKind, SingleplayerScenario } from "@shared/content/singleplayer";
import sampleCampaign from "../../fixtures/content/campaigns/sample-campaign/campaignConfig.json";

const api = vi.hoisted(() => ({ list: vi.fn(), getSaves: vi.fn(), recordResult: vi.fn(), deleteSave: vi.fn(), onSaveChanged: vi.fn() }));
vi.mock("@renderer/api/singleplayer", () => ({ singleplayerApi: api }));

const { singleplayerStore, singleplayerUpdates } = await import("@renderer/store/singleplayer.store");
const { initSingleplayerLogic, singleplayerLogic } = await import("@renderer/logic/singleplayer");

// Stands in for main, which keeps the saves and returns each one as written.
const disk = new Map<string, SingleplayerSave>();

function fakeMain() {
    disk.clear();
    api.list.mockResolvedValue(content([]));
    api.getSaves.mockImplementation(async () => ({ saves: structuredClone([...disk.values()]), problems: [] }));
    api.recordResult.mockImplementation(async (kind: SingleplayerKind, ref: SingleplayerItemRef, result: SavedResult) => {
        const key = saveKey(kind, ref);
        const save = disk.get(key) ?? { formatVersion: 1, item: { kind, source: ref.source, rootId: ref.rootId, id: ref.id }, history: [] };
        const updated = { ...save, history: [...save.history, result] };
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
            expect(singleplayerLogic.results("campaign", official)).toEqual([]);
            expect(singleplayerLogic.results("campaign", custom)).toHaveLength(1);
        });

        it("keeps a save that failed to delete", async () => {
            await singleplayerLogic.recordCampaignResult(official, "mission01", "victory");
            api.deleteSave.mockRejectedValueOnce(new Error("singleplayer:deleteSave failed: busy"));

            await singleplayerLogic.deleteSave("campaign", official);

            expect(singleplayerLogic.results("campaign", official)).toHaveLength(1);
            expect(singleplayerStore.saveError).toBe("singleplayer:deleteSave failed: busy");
        });
    });

    describe("save changes from main", () => {
        // Subscribed once for the whole file, the same as at startup, so the handler is caught here.
        let reportChange: (change: SaveChange) => void;

        beforeEach(() => {
            api.onSaveChanged.mockImplementation((handler) => (reportChange = handler));
            initSingleplayerLogic();
        });

        it("shows a result main recorded without being asked from here", () => {
            const save: SingleplayerSave = {
                formatVersion: 1,
                item: officialItem,
                history: [{ missionId: "mission01", outcome: "victory", variables: { lives: 3 } }],
            };

            reportChange({ item: save.item, save });

            expect(singleplayerLogic.campaignState(official).completed).toEqual(["mission01"]);
            expect(singleplayerLogic.variablesOf(official)).toEqual({ lives: 3 });
            expect(singleplayerLogic.campaignState(custom).completed).toEqual([]);
        });

        it("drops a save main deleted, and leaves an error from this window alone", async () => {
            await singleplayerLogic.recordCampaignResult(official, "mission01", "victory");
            singleplayerUpdates.saveFailed("singleplayer:recordResult failed: boom");

            reportChange({ item: officialItem, save: undefined });

            expect(singleplayerLogic.results("campaign", official)).toEqual([]);
            expect(singleplayerStore.saveError).toBe("singleplayer:recordResult failed: boom");
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

            expect(singleplayerLogic.results("campaign", official)).toEqual([]);
        });
    });
});
