// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { missionEffectiveSettings, missionHumanTeamNames, missionToScriptStr } from "@main/utils/mission-script-converter";
import type { MissionModel, MissionStartScript } from "@main/content/game/mission";
import type { CampaignModel } from "@main/content/game/campaign-model";

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_MISSION_ID = "m1";
const BASE_MISSION_FOLDER = "missions/campaigns/test/m1";
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

const MOD_DEATH_MODE_VALUE = "killall";

const TEAM_RGB_COLOR: [number, number, number] = [0.1, 0.5, 1];
const TEAM_SIDE = "Armada";
const TEAM_START_POS_X = 1234;
const TEAM_START_POS_Z = 5678;
const TEAM_INCOME_MULTIPLIER = 1.5;
const TEAM_AI_HELPER = "AiHelper";

const GAME_VERSION = "Beyond All Reason test-2026-06-03-stable";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function baseMission(overrides: Partial<MissionModel> = {}, startScriptOverrides: Partial<MissionStartScript> = {}): MissionModel {
    return {
        missionId: BASE_MISSION_ID,
        missionFolder: BASE_MISSION_FOLDER,
        title: BASE_MISSION_TITLE,
        description: BASE_MISSION_DESCRIPTION,
        startPos: { x: 0, y: 0 },
        unlocked: true,
        startScript: {
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
            ...startScriptOverrides,
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

function decodeMissionOptions(script: string) {
    const match = script.match(/missionoptions=([^;]+);/);
    expect(match).not.toBeNull();
    return JSON.parse(atob(match![1]));
}

/**
 * Returns the body of a `[section] { ... }` block, so assertions can target one
 * team rather than the whole script. Only valid for blocks without nested blocks.
 */
function sectionBody(script: string, section: string): string {
    const match = script.match(new RegExp(`\\[${section}\\] \\{([^{}]*)\\}`));
    expect(match, `expected script to contain a [${section}] section`).not.toBeNull();
    return match![1];
}

// ─── missionEffectiveSettings ─────────────────────────────────────────────────

describe("missionEffectiveSettings", () => {
    it("uses mission-level values when the mission provides them, overriding campaign defaults", () => {
        const campaign = baseCampaign();
        const mission = baseMission(
            {
                difficulties: { [MISSION_DIFFICULTY]: { playerHandicap: MISSION_HANDICAP, enemyHandicap: MISSION_HANDICAP } },
                defaultDifficulty: MISSION_DIFFICULTY,
            },
            { disableFactionPicker: true, disableInitialCommanderSpawn: true }
        );

        const settings = missionEffectiveSettings(campaign, mission);

        expect(settings.difficulties).toEqual([{ name: MISSION_DIFFICULTY, playerHandicap: MISSION_HANDICAP, enemyHandicap: MISSION_HANDICAP }]);
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
            { name: CAMPAIGN_DIFFICULTY_EASY, playerHandicap: CAMPAIGN_HANDICAP_EASY_PLAYER, enemyHandicap: CAMPAIGN_HANDICAP_EASY_ENEMY },
            { name: CAMPAIGN_DIFFICULTY_HARD, playerHandicap: 0, enemyHandicap: CAMPAIGN_HANDICAP_HARD_ENEMY },
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

    it("never selects a default that is absent from the resolved difficulties", () => {
        // A mission that replaces the campaign's difficulty map cannot use the campaign's
        // default, which names an entry of the map it just replaced.
        const mission = baseMission({
            difficulties: { [MISSION_DIFFICULTY]: { playerHandicap: MISSION_HANDICAP } },
        });

        const settings = missionEffectiveSettings(baseCampaign(), mission);

        expect(settings.difficulties).toEqual([{ name: MISSION_DIFFICULTY, playerHandicap: MISSION_HANDICAP, enemyHandicap: 0 }]);
        expect(settings.defaultDifficulty).toBe(MISSION_DIFFICULTY);
    });

    it("lets a mission re-point the default at another entry of the campaign's difficulties", () => {
        const mission = baseMission({ defaultDifficulty: CAMPAIGN_DIFFICULTY_HARD });

        const settings = missionEffectiveSettings(baseCampaign(), mission);

        expect(settings.difficulties).toHaveLength(2);
        expect(settings.defaultDifficulty).toBe(CAMPAIGN_DIFFICULTY_HARD);
    });

    it("falls back to the first difficulty when the named default does not exist", () => {
        const campaign = baseCampaign({ defaultDifficulty: "NoSuchDifficulty" });

        const settings = missionEffectiveSettings(campaign, baseMission());

        expect(settings.defaultDifficulty).toBe(CAMPAIGN_DIFFICULTY_EASY);
    });

    it("uses a standalone mission's own difficulties when it belongs to no campaign", () => {
        const mission = baseMission({
            difficulties: {
                [MISSION_DIFFICULTY]: { playerHandicap: MISSION_PLAYER_HANDICAP, enemyHandicap: MISSION_ENEMY_HANDICAP },
                [CAMPAIGN_DIFFICULTY_HARD]: { enemyHandicap: CAMPAIGN_HANDICAP_HARD_ENEMY },
            },
            defaultDifficulty: CAMPAIGN_DIFFICULTY_HARD,
        });

        const settings = missionEffectiveSettings(undefined, mission);

        expect(settings.difficulties).toEqual([
            { name: MISSION_DIFFICULTY, playerHandicap: MISSION_PLAYER_HANDICAP, enemyHandicap: MISSION_ENEMY_HANDICAP },
            { name: CAMPAIGN_DIFFICULTY_HARD, playerHandicap: 0, enemyHandicap: CAMPAIGN_HANDICAP_HARD_ENEMY },
        ]);
        expect(settings.defaultDifficulty).toBe(CAMPAIGN_DIFFICULTY_HARD);
    });
});

// ─── missionHumanTeamNames ────────────────────────────────────────────────────

describe("missionHumanTeamNames", () => {
    it("returns the human team name for a single-player mission with an AI team", () => {
        const mission = baseMission();
        expect(missionHumanTeamNames(mission)).toEqual([TEAM_PLAYER]);
    });

    it("excludes AI teams", () => {
        const mission = baseMission(
            {},
            {
                allyTeams: {
                    Ally0: {
                        teams: {
                            [TEAM_PLAYER]: { name: TEAM_PLAYER },
                            [TEAM_ENEMY]: { name: TEAM_ENEMY, ai: AI_BARB },
                        },
                    },
                },
            }
        );

        expect(missionHumanTeamNames(mission)).toEqual([TEAM_PLAYER]);
    });

    it("collects human teams from multiple ally teams in definition order", () => {
        const mission = baseMission(
            {},
            {
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
            }
        );

        expect(missionHumanTeamNames(mission)).toEqual([TEAM_PLAYER1, TEAM_PLAYER2]);
    });

    it("returns an empty array when all teams are AI", () => {
        const mission = baseMission(
            {},
            {
                allyTeams: {
                    Ally0: {
                        teams: {
                            [TEAM_ENEMY]: { name: TEAM_ENEMY, ai: AI_BARB },
                        },
                    },
                },
            }
        );

        expect(missionHumanTeamNames(mission)).toEqual([]);
    });

    it("returns an empty array when there are no ally teams", () => {
        const mission = baseMission({}, { allyTeams: {} });
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
        const script = missionToScriptStr(baseMission({}, { startPosType: "fixed" }), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("startpostype=0");
    });

    it("maps startPosType 'random' to startpostype=1", () => {
        const script = missionToScriptStr(baseMission({}, { startPosType: "random" }), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("startpostype=1");
    });

    it("maps startPosType 'chooseInGame' to startpostype=2", () => {
        const script = missionToScriptStr(baseMission({}, { startPosType: "chooseInGame" }), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("startpostype=2");
    });

    it("maps startPosType 'chooseBeforeGame' to startpostype=3", () => {
        const script = missionToScriptStr(baseMission({}, { startPosType: "chooseBeforeGame" }), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("startpostype=3");
    });

    it("defaults to startpostype=3 when startPosType is omitted", () => {
        const script = missionToScriptStr(baseMission({}, { startPosType: undefined }), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
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
        const mission = baseMission(
            {},
            {
                allyTeams: {
                    Enemy: {
                        teams: {
                            [TEAM_ENEMY_BOT]: { ai: AI_BARB, name: TEAM_ENEMY_BOT },
                        },
                    },
                },
            }
        );

        const script = missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("[ai0]");
        expect(script).toContain(`shortname=${AI_BARB}`);
    });

    it("writes rgbColor as three space-separated components", () => {
        const mission = baseMission(
            {},
            {
                allyTeams: {
                    Ally0: {
                        teams: {
                            [TEAM_PLAYER]: { name: TEAM_PLAYER, rgbColor: TEAM_RGB_COLOR },
                        },
                    },
                },
            }
        );

        const script = missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain(`rgbcolor=${TEAM_RGB_COLOR.join(" ")}`);
    });

    it("omits rgbcolor when the team defines no colour", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).not.toContain("rgbcolor=");
    });

    it("encodes missionoptions as base64 JSON in [modoptions]", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("[modoptions]");

        expect(decodeMissionOptions(script).missionFolder).toBe(BASE_MISSION_FOLDER);
    });

    it("includes difficulty name in encoded missionoptions", () => {
        const difficulty = { name: CAMPAIGN_DIFFICULTY_HARD, playerHandicap: 0, enemyHandicap: CAMPAIGN_HANDICAP_HARD_ENEMY };
        const script = missionToScriptStr(baseMission(), difficulty, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);

        expect(decodeMissionOptions(script).difficulty).toBe(CAMPAIGN_DIFFICULTY_HARD);
    });

    it("encodes allyTeam, team, ai, and player index maps inside missionoptions", () => {
        const mission = baseMission(
            {},
            {
                allyTeams: {
                    Ally0: {
                        teams: {
                            [TEAM_PLAYER]: { name: TEAM_PLAYER },
                            [TEAM_ENEMY]: { name: TEAM_ENEMY, ai: AI_BARB },
                        },
                    },
                },
            }
        );

        const script = missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        const decoded = decodeMissionOptions(script);

        expect(decoded.allyTeams).toEqual({ Ally0: 0 });
        expect(decoded.teams).toMatchObject({ [TEAM_PLAYER]: 0, [TEAM_ENEMY]: 1 });
        expect(decoded.players).toMatchObject({ "0": TEAM_PLAYER });
        expect(decoded.ais).toMatchObject({ "1": TEAM_ENEMY });
    });

    it("applies playerHandicap to human-side team", () => {
        const difficulty = { name: CAMPAIGN_DIFFICULTY_EASY, playerHandicap: MISSION_PLAYER_HANDICAP, enemyHandicap: 0 };

        const script = missionToScriptStr(baseMission(), difficulty, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain(`handicap=${MISSION_PLAYER_HANDICAP}`);
    });

    it("applies enemyHandicap to pure-AI ally team", () => {
        const mission = baseMission(
            {},
            {
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
            }
        );
        const difficulty = { name: CAMPAIGN_DIFFICULTY_HARD, playerHandicap: 0, enemyHandicap: MISSION_ENEMY_HANDICAP };

        const script = missionToScriptStr(mission, difficulty, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain(`handicap=${MISSION_ENEMY_HANDICAP}`);
    });

    it("does not emit handicap when it is zero", () => {
        const difficulty = { name: CAMPAIGN_DIFFICULTY_HARD, playerHandicap: 0, enemyHandicap: 0 };
        const script = missionToScriptStr(baseMission(), difficulty, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).not.toContain("handicap=");
    });

    it("emits a [restrict] block when unitLimits are set", () => {
        const mission = baseMission({}, { unitLimits: { [UNIT_ARMCOM]: UNIT_ARMCOM_LIMIT, [UNIT_CORCOM]: UNIT_CORCOM_LIMIT } });
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
        const mission = baseMission({}, { mapOptions: { waterlevel: MAP_WATER_LEVEL } });
        const script = missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain("[mapoptions]");
        expect(script).toContain(`waterlevel=${MAP_WATER_LEVEL}`);
    });

    it("does not emit a [mapoptions] block when mapOptions are empty", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).not.toContain("[mapoptions]");
    });

    it("includes extra modOptions keys alongside missionoptions", () => {
        const mission = baseMission({}, { modOptions: { deathMode: MOD_DEATH_MODE_VALUE } });
        const script = missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);
        expect(script).toContain(`deathMode=${MOD_DEATH_MODE_VALUE}`);
    });

    it("writes the optional team fields under their lowercased script keys", () => {
        const mission = baseMission(
            {},
            {
                allyTeams: {
                    Ally0: {
                        teams: {
                            [TEAM_PLAYER]: {
                                name: TEAM_PLAYER,
                                side: TEAM_SIDE,
                                startPosX: TEAM_START_POS_X,
                                startPosZ: TEAM_START_POS_Z,
                                incomeMultiplier: TEAM_INCOME_MULTIPLIER,
                            },
                        },
                    },
                },
            }
        );

        const team0 = sectionBody(missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION), "team0");

        expect(team0).toContain(`side=${TEAM_SIDE};`);
        expect(team0).toContain(`startposx=${TEAM_START_POS_X};`);
        expect(team0).toContain(`startposz=${TEAM_START_POS_Z};`);
        expect(team0).toContain(`incomemultiplier=${TEAM_INCOME_MULTIPLIER};`);
    });

    it("omits the optional team fields the mission does not define", () => {
        const team0 = sectionBody(missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION), "team0");

        expect(team0).not.toContain("side=");
        expect(team0).not.toContain("startposx=");
        expect(team0).not.toContain("startposz=");
        expect(team0).not.toContain("incomemultiplier=");
    });

    it("still writes zero-valued positions and multipliers, which are meaningful unlike a zero handicap", () => {
        const mission = baseMission(
            {},
            {
                allyTeams: {
                    Ally0: {
                        teams: {
                            [TEAM_PLAYER]: { name: TEAM_PLAYER, startPosX: 0, startPosZ: 0, incomeMultiplier: 0 },
                        },
                    },
                },
            }
        );

        const team0 = sectionBody(missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION), "team0");

        expect(team0).toContain("startposx=0;");
        expect(team0).toContain("startposz=0;");
        expect(team0).toContain("incomemultiplier=0;");
    });

    it("handicaps every team by whether its ally team contains a human, not by whether the team is an AI", () => {
        // An AI fighting alongside the player must be buffed like the player, not like the enemy.
        const mission = baseMission(
            {},
            {
                allyTeams: {
                    Ally0: {
                        teams: {
                            [TEAM_PLAYER]: { name: TEAM_PLAYER },
                            [TEAM_AI_HELPER]: { name: TEAM_AI_HELPER, ai: AI_BARB },
                        },
                    },
                    EnemyAlly: {
                        teams: {
                            [TEAM_ENEMY]: { name: TEAM_ENEMY, ai: AI_BARB },
                        },
                    },
                },
            }
        );
        const difficulty = { name: CAMPAIGN_DIFFICULTY_HARD, playerHandicap: MISSION_PLAYER_HANDICAP, enemyHandicap: MISSION_ENEMY_HANDICAP };

        const script = missionToScriptStr(mission, difficulty, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);

        expect(sectionBody(script, "team0")).toContain(`handicap=${MISSION_PLAYER_HANDICAP};`);
        expect(sectionBody(script, "team1")).toContain(`handicap=${MISSION_PLAYER_HANDICAP};`);
        expect(sectionBody(script, "team2")).toContain(`handicap=${MISSION_ENEMY_HANDICAP};`);
    });

    it("numbers teams sequentially across ally teams while players and bots are counted independently", () => {
        const mission = baseMission(
            {},
            {
                allyTeams: {
                    Ally0: {
                        teams: {
                            [TEAM_PLAYER1]: { name: TEAM_PLAYER1 },
                            [TEAM_AI_HELPER]: { name: TEAM_AI_HELPER, ai: AI_BARB },
                        },
                    },
                    EnemyAlly: {
                        teams: {
                            [TEAM_PLAYER2]: { name: TEAM_PLAYER2 },
                            [TEAM_ENEMY]: { name: TEAM_ENEMY, ai: AI_BARB },
                        },
                    },
                },
            }
        );

        const script = missionToScriptStr(mission, undefined, noopEffectiveSettings(), TEAM_PLAYER1, GAME_VERSION);

        // Each team belongs to the ally team it was declared under.
        expect(sectionBody(script, "team0")).toContain("allyteam=0;");
        expect(sectionBody(script, "team1")).toContain("allyteam=0;");
        expect(sectionBody(script, "team2")).toContain("allyteam=1;");
        expect(sectionBody(script, "team3")).toContain("allyteam=1;");

        // Humans and AIs are numbered in their own sequences but point back at the shared team ids.
        expect(sectionBody(script, "player0")).toContain("team=0;");
        expect(sectionBody(script, "player1")).toContain("team=2;");
        expect(sectionBody(script, "ai0")).toContain("team=1;");
        expect(sectionBody(script, "ai1")).toContain("team=3;");

        const decoded = decodeMissionOptions(script);
        expect(decoded.allyTeams).toEqual({ Ally0: 0, EnemyAlly: 1 });
        expect(decoded.teams).toEqual({ [TEAM_PLAYER1]: 0, [TEAM_AI_HELPER]: 1, [TEAM_PLAYER2]: 2, [TEAM_ENEMY]: 3 });
        expect(decoded.players).toEqual({ "0": TEAM_PLAYER1, "1": TEAM_PLAYER2 });
        expect(decoded.ais).toEqual({ "1": TEAM_AI_HELPER, "3": TEAM_ENEMY });
    });

    it("encodes an empty difficulty name when no difficulty is selected", () => {
        const script = missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION);

        expect(decodeMissionOptions(script).difficulty).toBe("");
    });

    it("carries the effective feature toggles into missionoptions", () => {
        const script = missionToScriptStr(baseMission(), undefined, { ...noopEffectiveSettings(), disableFactionPicker: true, disableInitialCommanderSpawn: true }, TEAM_PLAYER, GAME_VERSION);
        const decoded = decodeMissionOptions(script);

        expect(decoded.disableFactionPicker).toBe(true);
        expect(decoded.disableInitialCommanderSpawn).toBe(true);
        expect(decodeMissionOptions(missionToScriptStr(baseMission(), undefined, noopEffectiveSettings(), TEAM_PLAYER, GAME_VERSION))).toMatchObject({
            disableFactionPicker: false,
            disableInitialCommanderSpawn: false,
        });
    });
});
