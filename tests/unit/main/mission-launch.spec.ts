// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ContentRef } from "@main/content/content-ref";
import { InstallState, LaunchFailureError, missionInputs, planMissionLaunch } from "@main/content/singleplayer/mission-launch";
import type { SingleplayerSave } from "@shared/content/save";
import type { Compatibility } from "@shared/content/schema/common";
import type { MissionConfig } from "@shared/content/schema/mission-config";
import type { ItemDifficulties, SingleplayerCampaign, SingleplayerMission, SingleplayerScenario } from "@shared/content/singleplayer";

const ENGINE = "2026.07.04";
const OTHER_ENGINE = "2025.04.10";
const GAME = "Beyond All Reason test-31820-45ea098";
const OTHER_GAME = "Beyond All Reason test-28000-aaaaaaa";
const MAP = "Quicksilver Remake 1.24";
const DEFAULT_CONFIG = { alliances: { players: ["player"] }, playerTeam: ["player"] } as MissionConfig;
const ONE_PLAYER_CONFIG = { alliances: { solo: ["player"] }, playerTeam: ["player"] } as MissionConfig;

// What each kind of install offers.
function install({
    downloads = false,
    defaults = {},
    engines = [ENGINE],
    games = [GAME],
    maps = [MAP],
}: Partial<{ downloads: boolean; defaults: InstallState["installDefaults"]; engines: string[]; games: string[]; maps: string[] }> = {}): InstallState {
    const present = { engine: engines, game: games, map: maps };

    return {
        isPresent: (ref: ContentRef) => present[ref.type as "engine" | "game" | "map"].includes(ref.id),
        canAcquire: () => downloads,
        installedEngines: engines,
        installedGames: games,
        installDefaults: defaults,
        defaultEngine: ENGINE,
    };
}
const steam = (options: Omit<Parameters<typeof install>[0] & object, "downloads"> = {}) => install({ ...options, downloads: false });

function mission(id: string, maps: string[] = [], mapName = MAP): SingleplayerMission {
    return { id, path: path.join("content", id), manifest: { mapName }, configs: { default: DEFAULT_CONFIG, numPlayers: {} }, maps } as unknown as SingleplayerMission;
}

function scenario({ compatibility = [{ engineVersion: ENGINE, gameVersions: [GAME] }] as Compatibility | "dev", depend = [GAME], archive = true, maps = [] as string[], mapName = MAP } = {}) {
    const folder = path.join("content", "scenarios", "outpost-strike");

    return {
        ...mission("outpost-strike", maps, mapName),
        path: folder,
        kind: "scenario",
        compatibility,
        ...(archive ? { archivePath: path.join(folder, "games", "bar-scenario-outpost-strike.sdz"), archiveName: "bar-scenario-outpost-strike 1.0", archiveDepend: depend } : {}),
    } as unknown as SingleplayerScenario;
}

function campaign(missions: SingleplayerMission[], sharedMaps: string[] = []) {
    const folder = path.join("content", "campaigns", "sample");

    return {
        kind: "campaign",
        id: "sample",
        path: folder,
        compatibility: [{ engineVersion: ENGINE, gameVersions: [GAME] }],
        sharedMaps,
        missions,
        archivePath: path.join(folder, "games", "bar-campaign-sample.sdz"),
        archiveName: "bar-campaign-sample 1.0",
        archiveDepend: [GAME],
    } as unknown as SingleplayerCampaign;
}

const refusal = (run: () => unknown) => {
    try {
        run();
    } catch (err) {
        return err instanceof LaunchFailureError ? err.reason : err;
    }

    return undefined;
};

describe("planMissionLaunch", () => {
    it("launches a scenario from its own folder, with its archive as the game and its Lua as the entry point", () => {
        const item = scenario();

        expect(planMissionLaunch({ item }, steam())).toEqual({
            engineVersion: ENGINE,
            gameVersion: GAME,
            archiveName: "bar-scenario-outpost-strike 1.0",
            mapName: MAP,
            mapToEnsure: MAP,
            dataDirs: [item.path],
            entryPoint: "scenarios/outpost-strike/mission.lua",
            config: DEFAULT_CONFIG,
        });
    });

    it("launches a campaign mission from the campaign's folder, its shared folder and the mission's folder", () => {
        const first = mission("mission01");
        const sample = campaign([first]);
        const plan = planMissionLaunch({ item: first, campaign: sample }, steam());

        expect(plan.dataDirs).toEqual([sample.path, path.join(sample.path, "shared"), first.path]);
        expect(plan.entryPoint).toBe("campaigns/sample/mission01/mission.lua");
        expect(plan.archiveName).toBe("bar-campaign-sample 1.0");
    });

    it("uses the one-player config when there is one", () => {
        const item = scenario();
        item.configs.numPlayers = { "1": ONE_PLAYER_CONFIG };

        expect(planMissionLaunch({ item }, steam()).config).toBe(ONE_PLAYER_CONFIG);
    });

    it("refuses an item without a mission archive", () => {
        expect(refusal(() => planMissionLaunch({ item: scenario({ archive: false }) }, steam()))).toBe("no_archive");
    });

    describe("the engine and game", () => {
        it("are the install's own pair when it names both", () => {
            const plan = planMissionLaunch({ item: scenario() }, steam({ defaults: { engine: ENGINE, game: GAME }, engines: [ENGINE, OTHER_ENGINE] }));

            expect([plan.engineVersion, plan.gameVersion]).toEqual([ENGINE, GAME]);
        });

        it("are refused when the item doesn't accept the install's own pair", () => {
            expect(refusal(() => planMissionLaunch({ item: scenario() }, steam({ defaults: { engine: OTHER_ENGINE, game: GAME } })))).toBe("no_engine_and_game");
        });

        it("may be any installed engine with any installed game when the install names no pair", () => {
            const item = scenario({ compatibility: [{ engineVersion: OTHER_ENGINE, gameVersions: [GAME] }] });

            expect(planMissionLaunch({ item }, steam({ engines: [ENGINE, OTHER_ENGINE] })).engineVersion).toBe(OTHER_ENGINE);
        });

        // The engine loads the archive's dependency, so the game must be the one it depends on.
        it("must include the game the archive depends on", () => {
            const item = scenario({ compatibility: [{ engineVersion: ENGINE, gameVersions: [OTHER_GAME, GAME] }], depend: [GAME] });

            expect(planMissionLaunch({ item }, install({ downloads: true })).gameVersion).toBe(GAME);
            expect(refusal(() => planMissionLaunch({ item: scenario({ depend: [OTHER_GAME] }) }, install({ downloads: true })))).toBe("no_engine_and_game");
        });

        it("may be downloaded where engines and games can be", () => {
            const item = scenario({ compatibility: [{ engineVersion: OTHER_ENGINE, gameVersions: [GAME] }] });

            expect(planMissionLaunch({ item }, install({ downloads: true, engines: [], games: [] })).engineVersion).toBe(OTHER_ENGINE);
        });

        it("are the default engine and the depended-on game for content still in development", () => {
            const plan = planMissionLaunch({ item: scenario({ compatibility: "dev", depend: [OTHER_GAME, GAME] }) }, steam());

            expect([plan.engineVersion, plan.gameVersion]).toEqual([ENGINE, GAME]);
        });
    });

    describe("the map", () => {
        it("is left to the content check when installed or downloadable", () => {
            expect(planMissionLaunch({ item: scenario() }, steam()).mapToEnsure).toBe(MAP);
            expect(planMissionLaunch({ item: scenario() }, install({ downloads: true, maps: [] })).mapToEnsure).toBe(MAP);
        });

        // A shipped map is on the engine's path through the item's folders, and isn't content to fetch.
        it("isn't checked or fetched when the item ships it", () => {
            const own = scenario({ mapName: "Own Map 1.0", maps: ["Own Map 1.0"] });
            const first = mission("mission01", [], "Shared Map 1.0");

            expect(planMissionLaunch({ item: own }, steam()).mapToEnsure).toBeUndefined();
            expect(planMissionLaunch({ item: first, campaign: campaign([first], ["Shared Map 1.0"]) }, steam()).mapToEnsure).toBeUndefined();
        });

        it("refuses a map that is neither installed, shipped nor downloadable", () => {
            expect(refusal(() => planMissionLaunch({ item: scenario() }, steam({ maps: [] })))).toBe("map_unavailable");
        });
    });
});

describe("missionInputs", () => {
    const difficulties: ItemDifficulties = { difficulties: ["Easy", "Medium", "Hard"], defaultDifficulty: "Medium" };
    const save = (fields: Partial<SingleplayerSave>) =>
        ({ formatVersion: 1, item: { kind: "campaign", source: "custom", rootId: "custom", id: "sample" }, plays: {}, recent: [], ...fields }) as SingleplayerSave;
    const campaignProgress = { unlocked: [], removed: [], prerequisitesMet: [], variables: { mission01_choice: "left", mission01_score: 1200 } };

    it("gives a scenario the difficulty chosen, or its default, and no variables", () => {
        const item = { ...scenario(), ...difficulties } as SingleplayerScenario;

        expect(missionInputs({ item }, undefined)).toEqual({ difficulty: "Medium" });
        expect(missionInputs({ item }, save({ difficulty: "Hard" }))).toEqual({ difficulty: "Hard" });
    });

    it("gives a campaign mission the campaign's difficulty and the variables its missions have reported", () => {
        const owner = { ...campaign([mission("mission01")]), ...difficulties } as SingleplayerCampaign;

        expect(missionInputs({ item: owner.missions[0], campaign: owner }, save({ difficulty: "Easy", campaign: campaignProgress }))).toEqual({
            difficulty: "Easy",
            variables: { mission01_choice: "left", mission01_score: 1200 },
        });
    });

    it("leaves the variables out when the campaign has none", () => {
        const owner = { ...campaign([mission("mission01")]), ...difficulties } as SingleplayerCampaign;

        expect(missionInputs({ item: owner.missions[0], campaign: owner }, undefined)).toEqual({ difficulty: "Medium" });
        expect(missionInputs({ item: owner.missions[0], campaign: owner }, save({ campaign: { ...campaignProgress, variables: {} } }))).toEqual({ difficulty: "Medium" });
    });

    it("plays at the default when the saved difficulty is no longer offered", () => {
        const item = { ...scenario(), ...difficulties } as SingleplayerScenario;

        expect(missionInputs({ item }, save({ difficulty: "Story" }))).toEqual({ difficulty: "Medium" });
    });
});
