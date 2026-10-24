// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { applyResult, campaignState, campaignVariables, countPlay, type ItemProgress, itemStatus, missionStatus, reconcileCampaign } from "@shared/content/campaign-progress";
import type { ReportedResult } from "@shared/content/save";
import type { CampaignConfig } from "@shared/content/schema/campaign-config";
import sampleCampaign from "../../fixtures/content/campaigns/sample-campaign/campaignConfig.json";
import secondCampaign from "../../fixtures/content/campaigns/second-campaign/campaignConfig.json";

// The example graph from the content format: a replayable tutorial, a linear start, an A/B branch with
// optional missions that remove themselves on failure, and a final mission gated on both branches.
const config = sampleCampaign as CampaignConfig;

const win = (missionId: string): ReportedResult => ({ missionId, outcome: "victory" });
const lose = (missionId: string): ReportedResult => ({ missionId, outcome: "failure" });

// Each result applied once, in order, as they arrive in play.
const play = (campaign: CampaignConfig, results: ReportedResult[], from: ItemProgress = { plays: {} }) =>
    results.reduce<ItemProgress>((progress, result) => applyResult(campaign, progress, result), from);

// These cases were written against replaying a whole history, and applying results one at a time must give the
// same states.
const evaluateCampaign = (campaign: CampaignConfig, results: ReportedResult[]) => campaignState(campaign, play(campaign, results));

describe("applyResult and campaignState", () => {
    it("starts with the start missions available", () => {
        expect(evaluateCampaign(config, [])).toEqual({ available: ["tutorial", "mission01"], completed: [], finished: false, removed: [] });
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

    it("refuses a result for a mission the campaign doesn't have", () => {
        expect(() => evaluateCampaign(config, [win("cutMission")])).toThrow(/no mission cutMission/);
        expect(() => evaluateCampaign(config, [lose("toString")])).toThrow(/no mission toString/);
    });

    it("counts every play, won or lost", () => {
        expect(play(config, [win("mission01"), lose("mission02"), lose("mission02"), win("mission02")]).plays).toEqual({
            mission01: { victories: 1, failures: 0 },
            mission02: { victories: 1, failures: 2 },
        });
    });

    it("stays the same size however often a mission is replayed", () => {
        const once = play(config, [win("tutorial")]);
        const often = play(
            config,
            Array.from({ length: 1000 }, () => win("tutorial"))
        );

        expect(JSON.stringify(often).length).toBe(JSON.stringify(once).length + 3);
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
describe("applyResult and campaignState on the second sample campaign", () => {
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
    const variablesAfter = (results: ReportedResult[]) => campaignVariables(play(config, results));

    it("has none before any are reported", () => {
        expect(variablesAfter([win("mission01")])).toEqual({});
    });

    it("merges each result's variables over the ones before, from wins and losses alike", () => {
        const variables = variablesAfter([
            { ...win("mission01"), variables: { lives: 3, hero: "alice", veteran: false } },
            { ...lose("mission02"), variables: { lives: 2 } },
            { ...win("mission02"), variables: { veteran: true } },
        ]);

        expect(variables).toEqual({ lives: 2, hero: "alice", veteran: true });
    });

    it("deletes a variable reported as null", () => {
        expect(
            variablesAfter([
                { ...win("mission01"), variables: { lives: 3, hero: "alice" } },
                { ...win("mission02"), variables: { lives: null } },
            ])
        ).toEqual({
            hero: "alice",
        });
    });

    // Keys come from missions, so one that names an Object property must still be an ordinary variable.
    it("treats any key as a plain variable", () => {
        expect(variablesAfter([{ ...win("mission01"), variables: JSON.parse('{"__proto__": 1, "constructor": "x"}') }])).toEqual(
            Object.fromEntries([
                ["__proto__", 1],
                ["constructor", "x"],
            ])
        );
    });
});

// Saves outlive content updates. Progress already made stays as it was, except where the update can be fitted to
// it without guessing: missions dropped, and missions behind prerequisites the player has already won.
describe("content updates to a campaign with progress", () => {
    const pastMission02 = play(config, [win("mission01"), win("mission02")]);

    it("unlocks a new mission behind prerequisites the player has already won", () => {
        const updated: CampaignConfig = { ...config, missions: { ...config.missions, bonus: { prerequisites: ["mission01", "mission02"] } } };

        expect(campaignState(updated, pastMission02).available).toContain("bonus");
        expect(reconcileCampaign(updated, pastMission02).prerequisitesMet).toContain("bonus");
    });

    it("doesn't unlock a new mission added to the unlocks of a mission already won", () => {
        const updated: CampaignConfig = {
            ...config,
            missions: {
                ...config.missions,
                bonus: {},
                mission01: { ...config.missions.mission01, victoryUnlocks: [...(config.missions.mission01.victoryUnlocks ?? []), "bonus"] },
            },
        };

        expect(campaignState(updated, pastMission02).available).not.toContain("bonus");
    });

    it("never applies a new removal to a result already played", () => {
        const updated: CampaignConfig = {
            ...config,
            missions: { ...config.missions, mission02: { ...config.missions.mission02, victoryRemoves: ["missionB"] } },
        };

        expect(campaignState(updated, pastMission02).available).toEqual(["missionA", "missionB"]);
        expect(campaignState(updated, play(updated, [win("missionA")], pastMission02)).available).toContain("missionB");
    });

    it("applies a new removal from the next result that has it", () => {
        const updated: CampaignConfig = {
            ...config,
            missions: { ...config.missions, missionA: { ...config.missions.missionA, victoryRemoves: ["missionB"] } },
        };

        expect(campaignState(updated, play(updated, [win("missionA")], pastMission02)).available).not.toContain("missionB");
    });

    it("drops a mission the campaign no longer has, and keeps its plays", () => {
        const { missionB: _, ...missions } = config.missions;
        const updated: CampaignConfig = { ...config, missions };

        expect(campaignState(updated, pastMission02).available).toEqual(["missionA"]);
        expect(reconcileCampaign(updated, pastMission02).unlocked).not.toContain("missionB");
        expect(pastMission02.plays.mission02).toEqual({ victories: 1, failures: 0 });
    });

    it("follows a change to the final missions", () => {
        const progress = play(config, [win("mission01")]);

        expect(campaignState(config, progress).finished).toBe(false);
        expect(campaignState({ ...config, finalMission: ["mission01"] }, progress).finished).toBe(true);
    });

    it("follows a change to which missions are replayable", () => {
        const progress = play(config, [win("mission01")]);

        expect(campaignState({ ...config, settings: { replayableMissions: true } }, progress).available).toContain("mission01");
    });
});

describe("countPlay", () => {
    it("counts a scenario's or tutorial's plays under its own id", () => {
        expect(countPlay(countPlay({}, "basics", "failure"), "basics", "victory")).toEqual({ basics: { victories: 1, failures: 1 } });
    });
});
