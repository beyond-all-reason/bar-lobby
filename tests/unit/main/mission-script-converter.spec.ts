// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { missionEffectiveSettings, missionHumanTeamNames, missionToScriptStr } from "@main/utils/mission-script-converter";
import type { MissionModel } from "@main/content/game/mission";
import type { CampaignModel } from "@main/content/game/campaign-model";

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_MISSION_ID = "m1";
const BASE_MISSION_SCRIPT_PATH = "missions/m1.lua";
const BASE_MISSION_TITLE = "Test Mission";
const BASE_MISSION_DESCRIPTION = "A test";
const BASE_MAP_NAME = "TestMap_v1";

const BASE_CAMPAIGN_ID = "c1";
const BASE_CAMPAIGN_TITLE = "Test Campaign";
const BASE_CAMPAIGN_DESCRIPTION = "A test campaign";

const CAMPAIGN_DIFFICULTY_EASY = "Easy";
const CAMPAIGN_DIFFICULTY_HARD = "Hard";
const MISSION_DIFFICULTY = "Custom";

const CAMPAIGN_HANDICAP_EASY_PLAYER = 10;
const CAMPAIGN_HANDICAP_EASY_ENEMY = -10;
const CAMPAIGN_HANDICAP_HARD_ENEMY = 20;
const MISSION_HANDICAP = 5;
const MISSION_PLAYER_HANDICAP = 15;
const MISSION_ENEMY_HANDICAP = 25;

const TEAM_PLAYER = "Player";
const TEAM_PLAYER1 = "Player1";
const TEAM_PLAYER2 = "Player2";
const TEAM_ENEMY = "Enemy";
const TEAM_ENEMY_BOT = "EnemyBot";

const AI_BARB = "BARb";

const MAP_NAME_OVERRIDE = "OverrideMap_v2";

const UNIT_ARMCOM = "armcom";
const UNIT_CORCOM = "corcom";
const UNIT_ARMCOM_LIMIT = 1;
const UNIT_CORCOM_LIMIT = 0;

const MAP_WATER_LEVEL = 100;

const START_RECT_LEFT = 0;
const START_RECT_TOP = 0;
const START_RECT_RIGHT = 0.5;
const START_RECT_BOTTOM = 1;

const MOD_DEATH_MODE_VALUE = "killall";

const GAME_VERSION = "Beyond All Reason test-2026-06-03-stable";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function baseMission(overrides: Partial<MissionModel> = {}): MissionModel {
    return {
        missionId: BASE_MISSION_ID,
        missionScriptPath: BASE_MISSION_SCRIPT_PATH,
        title: BASE_MISSION_TITLE,
        description: BASE_MISSION_DESCRIPTION,
        startPos: { x: 0, y: 0 },
        unlocked: true,
        mapName: BASE_MAP_NAME,
        startPosType: "fixed",
        players: { min: 1, max: 1 },
        modOptions: {},
        mapOptions: {},
        unitLimits: {},
        allyTeams: {
            Ally0: {
                teams: {
                    [TEAM_PLAYER]: { name: TEAM_PLAYER },
                },
            },
        },
        ...overrides,
    };
}

function baseCampaign(overrides: Partial<CampaignModel> = {}): CampaignModel {
    return {
        campaignId: BASE_CAMPAIGN_ID,
        title: BASE_CAMPAIGN_TITLE,
        description: BASE_CAMPAIGN_DESCRIPTION,
        players: [1],
        difficulties: {
            [CAMPAIGN_DIFFICULTY_EASY]: { playerHandicap: CAMPAIGN_HANDICAP_EASY_PLAYER, enemyHandicap: CAMPAIGN_HANDICAP_EASY_ENEMY },
            [CAMPAIGN_DIFFICULTY_HARD]: { playerHandicap: 0, enemyHandicap: CAMPAIGN_HANDICAP_HARD_ENEMY },
        },
        defaultDifficulty: CAMPAIGN_DIFFICULTY_EASY,
        missions: {},
        ...overrides,
    };
}

function noopEffectiveSettings() {
    return {
        difficulties: [],
        defaultDifficulty: "",
        disableFactionPicker: false,
        disableInitialCommanderSpawn: false,
    };
}

// ─── missionEffectiveSettings ─────────────────────────────────────────────────

describe("missionEffectiveSettings", () => {
    it("uses mission-level values when the mission provides them, overriding campaign defaults", () => {
        const campaign = baseCampaign();
        const mission = baseMission({
            difficulties: [{ name: MISSION_DIFFICULTY, playerhandicap: MISSION_HANDICAP, enemyhandicap: MISSION_HANDICAP }],
            defaultDifficulty: MISSION_DIFFICULTY,
            disableFactionPicker: true,
            disableInitialCommanderSpawn: true,
        });

        const settings = missionEffectiveSettings(campaign, mission);

        expect(settings.difficulties).toEqual([{ name: MISSION_DIFFICULTY, playerhandicap: MISSION_HANDICAP, enemyhandicap: MISSION_HANDICAP }]);
        expect(settings.defaultDifficulty).toBe(MISSION_DIFFICULTY);
        expect(settings.disableFactionPicker).toBe(true);
        expect(settings.disableInitialCommanderSpawn).toBe(true);
    });

    it("falls back to campaign values and safe defaults when the mission does not provide them", () => {
        // Campaign difficulties with a missing handicap field should default to 0.
        const campaign = baseCampaign();

        // Mission without any overrides.
        const settingsWithCampaign = missionEffectiveSettings(campaign, baseMission());
        expect(settingsWithCampaign.difficulties).toEqual([
            { name: CAMPAIGN_DIFFICULTY_EASY, playerhandicap: CAMPAIGN_HANDICAP_EASY_PLAYER, enemyhandicap: CAMPAIGN_HANDICAP_EASY_ENEMY },
            { name: CAMPAIGN_DIFFICULTY_HARD, playerhandicap: 0, enemyhandicap: CAMPAIGN_HANDICAP_HARD_ENEMY },
        ]);
        expect(settingsWithCampaign.defaultDifficulty).toBe(CAMPAIGN_DIFFICULTY_EASY);
        expect(settingsWithCampaign.disableFactionPicker).toBe(false);
        expect(settingsWithCampaign.disableInitialCommanderSpawn).toBe(false);

        // Standalone mission (no campaign) falls back to empty difficulties and empty string.
        const settingsNoCampaign = missionEffectiveSettings(undefined, baseMission());
        expect(settingsNoCampaign.difficulties).toEqual([]);
        expect(settingsNoCampaign.defaultDifficulty).toBe("");
        expect(settingsNoCampaign.disableFactionPicker).toBe(false);
        expect(settingsNoCampaign.disableInitialCommanderSpawn).toBe(false);
    });
});

// ─── missionHumanTeamNames ────────────────────────────────────────────────────

describe("missionHumanTeamNames", () => {
    it("returns the human team name for a single-player mission with an AI team", () => {
        const mission = baseMission();
        expect(missionHumanTeamNames(mission)).toEqual([TEAM_PLAYER]);
    });

    it("uses the teamKey as the name when no explicit name is set", () => {
        const mission = baseMission({
            allyTeams: {
                Ally0: {
                    teams: {
                        HumanTeam: {},
                    },
                },
            },
        });

        expect(missionHumanTeamNames(mission)).toEqual(["HumanTeam"]);
    });

    it("excludes AI teams", () => {
        const mission = baseMission({
            allyTeams: {
                Ally0: {
                    teams: {
                        [TEAM_PLAYER]: { name: TEAM_PLAYER },
                        [TEAM_ENEMY]: { name: TEAM_ENEMY, ai: AI_BARB },
                    },
                },
            },
        });

        expect(missionHumanTeamNames(mission)).toEqual([TEAM_PLAYER]);
    });

    it("collects human teams from multiple ally teams in definition order", () => {
        const mission = baseMission({
            allyTeams: {
                Ally0: {
                    teams: {
                        [TEAM_PLAYER1]: { name: TEAM_PLAYER1 },
                    },
                },
                Ally1: {
                    teams: {
                        [TEAM_PLAYER2]: { name: TEAM_PLAYER2 },
                    },
                },
            },
        });

        expect(missionHumanTeamNames(mission)).toEqual([TEAM_PLAYER1, TEAM_PLAYER2]);
    });

    it("returns an empty array when all teams are AI", () => {
        const mission = baseMission({
            allyTeams: {
                Ally0: {
                    teams: {
                        [TEAM_ENEMY]: { ai: AI_BARB },
                    },
                },
            },
        });

        expect(missionHumanTeamNames(mission)).toEqual([]);
    });

    it("returns an empty array when there are no ally teams", () => {
        const mission = baseMission({ allyTeams: {} });
        expect(missionHumanTeamNames(mission)).toEqual([]);
    });
});

// ─── missionToScriptStr ───────────────────────────────────────────────────────

describe("missionToScriptStr", () => {
    it("produces a script string wrapped in [game] { ... }", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toMatch(/^\[game\] \{/);
        expect(script).toMatch(/\}$/);
    });

    it("includes the correct gametype and mapname", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain(`gametype=${GAME_VERSION}`);
        expect(script).toContain(`mapname=${BASE_MAP_NAME}`);
    });

    it("uses mapNameOverride when provided", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION, MAP_NAME_OVERRIDE);
        expect(script).toContain(`mapname=${MAP_NAME_OVERRIDE}`);
        expect(script).not.toContain(`mapname=${BASE_MAP_NAME}`);
    });

    it("sets myplayername to the given localPlayerTeamName", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain(`myplayername=${TEAM_PLAYER}`);
    });

    it("sets ishost=1", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("ishost=1");
    });

    it("maps startPosType 'fixed' to startpostype=0", () => {
        const script = missionToScriptStr(baseMission({ startPosType: "fixed" }), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("startpostype=0");
    });

    it("maps startPosType 'random' to startpostype=1", () => {
        const script = missionToScriptStr(baseMission({ startPosType: "random" }), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("startpostype=1");
    });

    it("maps startPosType 'chooseInGame' to startpostype=2", () => {
        const script = missionToScriptStr(baseMission({ startPosType: "chooseInGame" }), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("startpostype=2");
    });

    it("maps startPosType 'chooseBeforeGame' to startpostype=3", () => {
        const script = missionToScriptStr(baseMission({ startPosType: "chooseBeforeGame" }), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("startpostype=3");
    });

    it("includes a [player0] section with the human team name", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("[player0]");
        expect(script).toContain(`name=${TEAM_PLAYER}`);
    });

    it("includes an [allyteam0] section", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("[allyteam0]");
    });

    it("includes an AI bot in [ai0] with the correct shortname", () => {
        const mission = baseMission({
            allyTeams: {
                Enemy: {
                    teams: {
                        [TEAM_ENEMY_BOT]: { ai: AI_BARB, name: TEAM_ENEMY_BOT },
                    },
                },
            },
        });

        const script = missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("[ai0]");
        expect(script).toContain(`shortname=${AI_BARB}`);
    });

    it("encodes missionoptions as base64 JSON in [modoptions]", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("[modoptions]");

        const match = script.match(/missionoptions=([^;]+);/);
        expect(match).not.toBeNull();

        const decoded = JSON.parse(atob(match![1]));
        expect(decoded.missionScriptPath).toBe(BASE_MISSION_SCRIPT_PATH);
    });

    it("includes difficulty name in encoded missionoptions", () => {
        const difficulty = { name: CAMPAIGN_DIFFICULTY_HARD, playerhandicap: 0, enemyhandicap: CAMPAIGN_HANDICAP_HARD_ENEMY };
        const script = missionToScriptStr(baseMission(), difficulty, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);

        const match = script.match(/missionoptions=([^;]+);/);
        const decoded = JSON.parse(atob(match![1]));
        expect(decoded.difficulty).toBe(CAMPAIGN_DIFFICULTY_HARD);
    });

    it("encodes allyTeam, team, ai, and player index maps inside missionoptions", () => {
        const mission = baseMission({
            allyTeams: {
                Ally0: {
                    teams: {
                        [TEAM_PLAYER]: { name: TEAM_PLAYER },
                        [TEAM_ENEMY]: { name: TEAM_ENEMY, ai: AI_BARB },
                    },
                },
            },
        });

        const script = missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        const match = script.match(/missionoptions=([^;]+);/);
        const decoded = JSON.parse(atob(match![1]));

        expect(decoded.allyTeams).toEqual({ Ally0: 0 });
        expect(decoded.teams).toMatchObject({ [TEAM_PLAYER]: 0, [TEAM_ENEMY]: 1 });
        expect(decoded.players).toMatchObject({ "0": TEAM_PLAYER });
        expect(decoded.ais).toMatchObject({ "1": TEAM_ENEMY });
    });

    it("applies playerHandicap to human-side team", () => {
        const mission = baseMission({
            allyTeams: {
                Ally0: {
                    teams: {
                        [TEAM_PLAYER]: { name: TEAM_PLAYER },
                    },
                },
            },
        });
        const difficulty = { name: CAMPAIGN_DIFFICULTY_EASY, playerhandicap: MISSION_PLAYER_HANDICAP, enemyhandicap: 0 };

        const script = missionToScriptStr(mission, difficulty, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain(`handicap=${MISSION_PLAYER_HANDICAP}`);
    });

    it("applies enemyHandicap to pure-AI ally team", () => {
        const mission = baseMission({
            allyTeams: {
                Ally0: {
                    teams: {
                        [TEAM_PLAYER]: { name: TEAM_PLAYER },
                    },
                },
                EnemyAlly: {
                    teams: {
                        [TEAM_ENEMY]: { name: TEAM_ENEMY, ai: AI_BARB },
                    },
                },
            },
        });
        const difficulty = { name: CAMPAIGN_DIFFICULTY_HARD, playerhandicap: 0, enemyhandicap: MISSION_ENEMY_HANDICAP };

        const script = missionToScriptStr(mission, difficulty, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain(`handicap=${MISSION_ENEMY_HANDICAP}`);
    });

    it("does not emit handicap when it is zero", () => {
        const difficulty = { name: CAMPAIGN_DIFFICULTY_HARD, playerhandicap: 0, enemyhandicap: 0 };
        const script = missionToScriptStr(baseMission(), difficulty, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).not.toContain("handicap=");
    });

    it("emits a [restrict] block when unitLimits are set", () => {
        const mission = baseMission({ unitLimits: { [UNIT_ARMCOM]: UNIT_ARMCOM_LIMIT, [UNIT_CORCOM]: UNIT_CORCOM_LIMIT } });
        const script = missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);

        expect(script).toContain("[restrict]");
        expect(script).toContain("numrestrictions=2");
        expect(script).toContain(`unit0=${UNIT_ARMCOM}`);
        expect(script).toContain(`limit0=${UNIT_ARMCOM_LIMIT}`);
        expect(script).toContain(`unit1=${UNIT_CORCOM}`);
        expect(script).toContain(`limit1=${UNIT_CORCOM_LIMIT}`);
    });

    it("does not emit a [restrict] block when unitLimits are empty", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).not.toContain("[restrict]");
    });

    it("emits a [mapoptions] block when mapOptions are present", () => {
        const mission = baseMission({ mapOptions: { waterlevel: MAP_WATER_LEVEL } });
        const script = missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("[mapoptions]");
        expect(script).toContain(`waterlevel=${MAP_WATER_LEVEL}`);
    });

    it("does not emit a [mapoptions] block when mapOptions are empty", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).not.toContain("[mapoptions]");
    });

    it("includes extra modOptions keys alongside missionoptions", () => {
        const mission = baseMission({ modOptions: { deathMode: MOD_DEATH_MODE_VALUE } });
        const script = missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain(`deathMode=${MOD_DEATH_MODE_VALUE}`);
    });

    it("includes start-rect coordinates when set on an ally team", () => {
        const mission = baseMission({
            allyTeams: {
                Ally0: {
                    startRectLeft: START_RECT_LEFT,
                    startRectTop: START_RECT_TOP,
                    startRectRight: START_RECT_RIGHT,
                    startRectBottom: START_RECT_BOTTOM,
                    teams: {
                        [TEAM_PLAYER]: { name: TEAM_PLAYER },
                    },
                },
            },
        });

        const script = missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain(`startrectleft=${START_RECT_LEFT}`);
        expect(script).toContain(`startrecttop=${START_RECT_TOP}`);
        expect(script).toContain(`startrectright=${START_RECT_RIGHT}`);
        expect(script).toContain(`startrectbottom=${START_RECT_BOTTOM}`);
    });
});
