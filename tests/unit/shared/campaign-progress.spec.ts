// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { campaignVariables, evaluateCampaign, itemStatus, MissionResult, missionStatus } from "@shared/content/campaign-progress";
import type { CampaignConfig } from "@shared/content/schema/campaign-config";
import sampleCampaign from "../../fixtures/content/campaigns/sample-campaign/campaignConfig.json";
import secondCampaign from "../../fixtures/content/campaigns/second-campaign/campaignConfig.json";

// The example graph from the content format: a replayable tutorial, a linear start, an A/B branch with
// optional missions that remove themselves on failure, and a final mission gated on both branches.
const config = sampleCampaign as CampaignConfig;

const win = (missionId: string): MissionResult => ({ missionId, outcome: "victory" });
const lose = (missionId: string): MissionResult => ({ missionId, outcome: "failure" });

describe("evaluateCampaign", () => {
    it("starts with the start missions available", () => {
        expect(evaluateCampaign(config, [])).toEqual({ available: ["tutorial", "mission01"], completed: [], finished: false, removed: [], ignored: [] });
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
        expect(state.removed).toEqual(["tutorial", "optionalMissionA"]);
    });

    it("tells a removed mission apart from one never unlocked", () => {
        const state = evaluateCampaign(config, [win("mission01")]);

        expect(state.removed).toEqual(["tutorial"]);
        expect(state.removed).not.toContain("missionA");
    });

    it("no longer lists a mission as removed once it is unlocked again", () => {
        expect(evaluateCampaign(config, [win("mission01"), lose("mission02")]).removed).toEqual([]);
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

describe("missionStatus", () => {
    it("describes a start mission that has not been played", () => {
        expect(missionStatus(config, evaluateCampaign(config, []), "mission01")).toEqual({
            available: true,
            completed: false,
            replayable: false,
            removed: false,
            start: true,
            final: false,
        });
    });

    it("describes a won mission that cannot be replayed", () => {
        const status = missionStatus(config, evaluateCampaign(config, [win("mission01")]), "mission01");

        expect(status).toMatchObject({ available: false, completed: true, replayable: false });
    });

    it("describes a removed mission and a locked final mission", () => {
        const state = evaluateCampaign(config, [win("mission01")]);

        expect(missionStatus(config, state, "tutorial")).toMatchObject({ available: false, removed: true, replayable: true });
        expect(missionStatus(config, state, "finalMission")).toMatchObject({ available: false, removed: false, completed: false, final: true });
    });
});

describe("itemStatus", () => {
    it("keeps a scenario or tutorial available and replayable whether or not it is completed", () => {
        expect(itemStatus(false)).toMatchObject({ available: true, completed: false, replayable: true });
        expect(itemStatus(true)).toMatchObject({ available: true, completed: true, replayable: true });
    });
});

// A different shape: a choice between two routes that shuts the other off, a final unlocked by either route
// rather than by prerequisites, an optional mission only a defeat opens, and replayable missions by default.
describe("evaluateCampaign on the second sample campaign", () => {
    const second = secondCampaign as CampaignConfig;

    it("opens an optional mission on a defeat, which goes away once won", () => {
        expect(evaluateCampaign(second, [lose("landing")]).available).toEqual(["landing", "supplyRun"]);
        expect(evaluateCampaign(second, [lose("landing"), win("supplyRun")]).available).toEqual(["landing"]);
    });

    it("keeps won missions available, since the campaign makes them replayable", () => {
        expect(evaluateCampaign(second, [win("landing")]).available).toEqual(["landing", "northRoute", "southRoute"]);
    });

    it("shuts off the other route once one is won, and unlocks the final", () => {
        const state = evaluateCampaign(second, [win("landing"), win("northRoute")]);

        expect(state.available).toEqual(["landing", "northRoute", "finale"]);
        expect(state.removed).toEqual(["southRoute"]);
    });

    it("finishes on the final, which overrides the campaign and cannot be replayed", () => {
        const state = evaluateCampaign(second, [win("landing"), win("southRoute"), win("finale")]);

        expect(state.finished).toBe(true);
        expect(state.available).toEqual(["landing", "southRoute"]);
    });
});

describe("campaignVariables", () => {
    it("has none before any are reported", () => {
        expect(campaignVariables([win("mission01")])).toEqual({});
    });

    it("merges each result's variables over the ones before, from wins and losses alike", () => {
        const variables = campaignVariables([
            { ...win("mission01"), variables: { lives: 3, hero: "alice", veteran: false } },
            { ...lose("mission02"), variables: { lives: 2 } },
            { ...win("mission02"), variables: { veteran: true } },
        ]);

        expect(variables).toEqual({ lives: 2, hero: "alice", veteran: true });
    });

    it("deletes a variable reported as null", () => {
        expect(
            campaignVariables([
                { ...win("mission01"), variables: { lives: 3, hero: "alice" } },
                { ...win("mission02"), variables: { lives: null } },
            ])
        ).toEqual({
            hero: "alice",
        });
    });

    it("keeps variables from a mission the campaign no longer has", () => {
        expect(campaignVariables([{ ...win("retiredMission"), variables: { gold: 10 } }])).toEqual({ gold: 10 });
    });

    // Keys come from missions, so one that names an Object property must still be an ordinary variable.
    it("treats any key as a plain variable", () => {
        expect(campaignVariables([{ ...win("mission01"), variables: JSON.parse('{"__proto__": 1, "constructor": "x"}') }])).toEqual(
            Object.fromEntries([
                ["__proto__", 1],
                ["constructor", "x"],
            ])
        );
    });
});
