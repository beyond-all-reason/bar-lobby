// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignConfig } from "@shared/content/schema/campaign-config";
import type { SingleplayerCampaign, SingleplayerContent, SingleplayerScenario } from "@shared/content/singleplayer";
import sampleCampaign from "../../fixtures/content/campaigns/sample-campaign/campaignConfig.json";

const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@renderer/api/singleplayer", () => ({ singleplayerApi: { list: api.list } }));

const { singleplayerStore, singleplayerUpdates } = await import("@renderer/store/singleplayer.store");
const { singleplayerLogic } = await import("@renderer/logic/singleplayer");

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

function winThroughToFinal(campaign: SingleplayerCampaign) {
    for (const missionId of ["mission01", "mission02", "missionA", "missionB"]) {
        singleplayerLogic.recordCampaignResult(campaign, missionId, "victory");
    }
}

describe("singleplayer logic", () => {
    beforeEach(() => {
        singleplayerUpdates.clear();
        api.list.mockReset();
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

        it("keeps results recorded before a rescan", async () => {
            singleplayerLogic.recordCampaignResult(official, "mission01", "victory");
            api.list.mockResolvedValue(content([]));

            await singleplayerLogic.loadContent();

            expect(singleplayerLogic.campaignState(official).completed).toEqual(["mission01"]);
        });
    });

    describe("campaign results", () => {
        it("moves the campaign on as results are recorded", () => {
            const { state, finishedNow } = singleplayerLogic.recordCampaignResult(official, "mission01", "victory");

            expect(state.available).toEqual(["mission02"]);
            expect(state.removed).toEqual(["tutorial"]);
            expect(finishedNow).toBe(false);
        });

        it("completes the campaign on winning a final mission, and says so only once", () => {
            winThroughToFinal(official);

            expect(singleplayerLogic.recordCampaignResult(official, "finalMission", "victory").finishedNow).toBe(true);
            expect(singleplayerLogic.campaignCompleted(official)).toBe(true);
            expect(singleplayerLogic.recordCampaignResult(official, "optionalMissionA", "victory").finishedNow).toBe(false);
        });

        it("keeps official and custom campaigns with the same id apart", () => {
            singleplayerLogic.recordCampaignResult(official, "mission01", "victory");

            expect(singleplayerLogic.campaignState(custom).completed).toEqual([]);
        });

        it("resets one campaign only", () => {
            singleplayerLogic.recordCampaignResult(official, "mission01", "victory");
            singleplayerLogic.recordCampaignResult(custom, "mission01", "victory");

            singleplayerLogic.resetProgress("campaign", official);

            expect(singleplayerLogic.results("campaign", official)).toEqual([]);
            expect(singleplayerLogic.results("campaign", custom)).toHaveLength(1);
        });
    });

    describe("tutorials", () => {
        it("completes a tutorial on a win but not on a loss", () => {
            const tutorial = makeTutorial("basics");

            singleplayerLogic.recordItemResult(tutorial, "failure");
            expect(singleplayerLogic.itemCompleted(tutorial)).toBe(false);

            singleplayerLogic.recordItemResult(tutorial, "victory");
            expect(singleplayerLogic.itemCompleted(tutorial)).toBe(true);
        });

        it("completes a root's tutorials once every one of them is won", () => {
            const [first, second, other] = [makeTutorial("first"), makeTutorial("second"), makeTutorial("first", "custom")];
            singleplayerUpdates.loaded(content([first, second, other]));

            singleplayerLogic.recordItemResult(first, "victory");
            expect(singleplayerLogic.tutorialsCompleted("official", "official")).toBe(false);

            singleplayerLogic.recordItemResult(second, "victory");
            expect(singleplayerLogic.tutorialsCompleted("official", "official")).toBe(true);
            expect(singleplayerLogic.tutorialsCompleted("custom", "custom")).toBe(false);
        });

        it("resets every tutorial in one root only", () => {
            const [first, second, other] = [makeTutorial("first"), makeTutorial("second"), makeTutorial("first", "custom")];
            singleplayerUpdates.loaded(content([first, second, other]));
            for (const tutorial of [first, second, other]) {
                singleplayerLogic.recordItemResult(tutorial, "victory");
            }

            singleplayerLogic.resetTutorials("official", "official");

            expect(singleplayerLogic.itemCompleted(first)).toBe(false);
            expect(singleplayerLogic.itemCompleted(second)).toBe(false);
            expect(singleplayerLogic.itemCompleted(other)).toBe(true);
        });

        it("never counts a root without tutorials as completed", () => {
            singleplayerUpdates.loaded(content([]));

            expect(singleplayerLogic.tutorialsCompleted("official", "official")).toBe(false);
        });

        // A tutorial and a campaign in the same root may share an id.
        it("keeps a tutorial's results apart from a campaign with the same id", () => {
            const tutorial = makeTutorial("sample-campaign");

            singleplayerLogic.recordItemResult(tutorial, "victory");

            expect(singleplayerLogic.results("campaign", official)).toEqual([]);
        });
    });
});
