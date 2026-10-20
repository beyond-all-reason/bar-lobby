// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { evaluateCampaign, MissionResult } from "@shared/content/campaign-progress";
import type { CampaignConfig } from "@shared/content/schema/campaign-config";
import sampleCampaign from "../../fixtures/content/campaigns/sample-campaign/campaignConfig.json";

// The example graph from the content format: a replayable tutorial, a linear start, an A/B branch with
// optional missions that remove themselves on failure, and a final mission gated on both branches.
const config = sampleCampaign as CampaignConfig;

const win = (missionId: string): MissionResult => ({ missionId, outcome: "victory" });
const lose = (missionId: string): MissionResult => ({ missionId, outcome: "failure" });

describe("evaluateCampaign", () => {
    it("starts with the start missions available", () => {
        expect(evaluateCampaign(config, [])).toEqual({ available: ["tutorial", "mission01"], completed: [], finished: false, ignored: [] });
    });

    it("keeps a replayable mission available after it is won", () => {
        const state = evaluateCampaign(config, [win("tutorial")]);

        expect(state.available).toEqual(["tutorial", "mission01"]);
        expect(state.completed).toEqual(["tutorial"]);
    });

    it("unlocks and removes on victory, and drops a won mission that is not replayable", () => {
        expect(evaluateCampaign(config, [win("mission01")]).available).toEqual(["mission02"]);
    });

    it("unlocks on failure without completing the mission", () => {
        const state = evaluateCampaign(config, [win("mission01"), lose("mission02")]);

        expect(state.available).toEqual(["tutorial", "mission02"]);
        expect(state.completed).toEqual(["mission01"]);
    });

    it("opens both branches, then their optional missions", () => {
        expect(evaluateCampaign(config, [win("mission01"), win("mission02")]).available).toEqual(["missionA", "missionB"]);
        expect(evaluateCampaign(config, [win("mission01"), win("mission02"), win("missionA")]).available).toEqual(["missionB", "optionalMissionA"]);
    });

    it("lets an optional mission remove itself when it is lost", () => {
        const state = evaluateCampaign(config, [win("mission01"), win("mission02"), win("missionA"), lose("optionalMissionA")]);

        expect(state.available).toEqual(["missionB"]);
    });

    it("unlocks the final mission once every prerequisite is won, and finishes on winning it", () => {
        const beforeFinal = [win("mission01"), win("mission02"), win("missionA")];

        expect(evaluateCampaign(config, beforeFinal).available).not.toContain("finalMission");

        const unlocked = evaluateCampaign(config, [...beforeFinal, win("missionB")]);
        expect(unlocked.available).toEqual(["optionalMissionA", "optionalMissionB", "finalMission"]);
        expect(unlocked.finished).toBe(false);

        expect(evaluateCampaign(config, [...beforeFinal, win("missionB"), win("finalMission")]).finished).toBe(true);
    });

    it("does not finish on losing the final mission", () => {
        const state = evaluateCampaign(config, [win("mission01"), win("mission02"), win("missionA"), win("missionB"), lose("finalMission")]);

        expect(state.finished).toBe(false);
        expect(state.available).toContain("finalMission");
    });

    // Saves outlive content updates, so a mission that has since been cut is skipped rather than fatal.
    it("skips and reports results for missions the campaign no longer has", () => {
        const state = evaluateCampaign(config, [win("mission01"), win("cutMission"), lose("toString"), win("mission02")]);

        expect(state.ignored).toEqual([win("cutMission"), lose("toString")]);
        expect(state.available).toEqual(["missionA", "missionB"]);
        expect(state.completed).toEqual(["mission01", "mission02"]);
    });

    it("keeps a mission unlocked by prerequisites removed once a later result removes it", () => {
        const gated: CampaignConfig = {
            ...config,
            missions: { first: { victoryRemoves: [] }, second: { victoryRemoves: ["bonus"] }, bonus: { prerequisites: ["first"] } },
            startMission: ["first", "second"],
            finalMission: [],
        };

        expect(evaluateCampaign(gated, [win("first")]).available).toEqual(["second", "bonus"]);
        expect(evaluateCampaign(gated, [win("first"), win("second")]).available).toEqual([]);
    });

    it("lets a mission override the campaign's replayable setting", () => {
        const replayable: CampaignConfig = {
            ...config,
            settings: { replayableMissions: true },
            missions: { ...config.missions, mission02: { ...config.missions.mission02, settings: { replayable: false } } },
        };

        expect(evaluateCampaign(replayable, [win("mission01"), win("mission02")]).available).toEqual(["mission01", "missionA", "missionB"]);
    });
});
