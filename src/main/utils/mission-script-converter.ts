// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { AllyTeam, Bot, Game, Player, Team } from "@main/model/start-script";
import { AllyTeamModel, MissionDifficulty, MissionModel, TeamModel } from "@main/content/game/mission";
import { CampaignDifficulty, CampaignModel } from "@main/content/game/campaign-model";
import { startScriptConverter } from "@main/utils/start-script-converter";

type MissionEffectiveSettings = {
    difficulties: MissionDifficulty[];
    defaultDifficulty: string;
    disableFactionPicker: boolean;
    disableInitialCommanderSpawn: boolean;
};

/**
 * Resolves the effective settings for a mission, falling back to campaign-level
 * defaults where the mission does not override them.
 *
 * Accepts `undefined` for campaign to support standalone missions
 * (e.g. future scenarios migrated to MissionModel) that belong to no campaign.
 */
export function missionEffectiveSettings(campaign: CampaignModel | undefined, mission: MissionModel): MissionEffectiveSettings {
    const campaignDifficulties = campaign ? campaignDifficultiesToArray(campaign.difficulties) : [];
    return {
        difficulties: mission.difficulties ?? campaignDifficulties,
        defaultDifficulty: mission.defaultDifficulty ?? campaign?.defaultDifficulty ?? "",
        disableFactionPicker: mission.disableFactionPicker ?? false,
        disableInitialCommanderSpawn: mission.disableInitialCommanderSpawn ?? false,
    };
}

function campaignDifficultiesToArray(difficulties: Record<string, CampaignDifficulty>): MissionDifficulty[] {
    return Object.entries(difficulties).map(([name, d]) => ({
        name,
        playerhandicap: d.playerHandicap ?? 0,
        enemyhandicap: d.enemyHandicap ?? 0,
    }));
}

/** Mutable accumulator threaded through the ally-team and team loops in {@link missionToGame}. */
type GameBuildContext = {
    allyTeams: AllyTeam[];
    teams: Team[];
    players: Player[];
    bots: Bot[];
    allyTeamsMap: Record<string, number>;
    teamsMap: Record<string, number>;
    aisMap: Record<number, string>;
    playersMap: Record<number, string>;
    allyTeamIdx: number;
    teamIdx: number;
    playerIdx: number;
    botIdx: number;
};

function humanTeamNamesForAllyTeam(allyTeam: AllyTeamModel): string[] {
    return Object.entries(allyTeam.teams)
        .filter(([, teamDef]) => !teamDef.ai)
        .map(([teamKey, teamDef]) => teamDef.name ?? teamKey);
}

function processTeam(ctx: GameBuildContext, atIdx: number, allyTeamHasHuman: boolean, teamKey: string, teamDef: TeamModel, playerHandicap: number, enemyHandicap: number): void {
    const thisTeamIdx = ctx.teamIdx++;
    ctx.teamsMap[teamKey] = thisTeamIdx;

    const isAi = !!teamDef.ai;
    const handicap = allyTeamHasHuman ? playerHandicap : enemyHandicap;

    const teamEntry: Team = {
        id: thisTeamIdx,
        allyteam: atIdx,
        teamleader: 0,
        ...(teamDef.Side && { side: teamDef.Side }),
        ...(teamDef.StartPosX !== undefined && { startposx: teamDef.StartPosX }),
        ...(teamDef.StartPosZ !== undefined && { startposz: teamDef.StartPosZ }),
        ...(teamDef.IncomeMultiplier !== undefined && { incomemultiplier: teamDef.IncomeMultiplier }),
        ...(handicap !== 0 && { handicap }),
    };
    ctx.teams.push(teamEntry);

    const teamName = teamDef.name ?? teamKey;

    if (isAi) {
        ctx.aisMap[thisTeamIdx] = teamName;
        ctx.bots.push({
            id: ctx.botIdx++,
            team: thisTeamIdx,
            shortname: teamDef.ai!,
            name: teamName,
            host: 0,
        });
    } else {
        ctx.playersMap[ctx.playerIdx] = teamName;
        ctx.players.push({
            id: ctx.playerIdx++,
            team: thisTeamIdx,
            name: teamName,
        });
    }
}

function processAllyTeam(ctx: GameBuildContext, allyTeamName: string, allyTeam: AllyTeamModel, playerHandicap: number, enemyHandicap: number): void {
    const atIdx = ctx.allyTeamIdx++;
    ctx.allyTeamsMap[allyTeamName] = atIdx;

    const entry: AllyTeam = { id: atIdx, numallies: 0 };
    if (allyTeam.startRectLeft !== undefined) entry.startrectleft = allyTeam.startRectLeft;
    if (allyTeam.startRectTop !== undefined) entry.startrecttop = allyTeam.startRectTop;
    if (allyTeam.startRectRight !== undefined) entry.startrectright = allyTeam.startRectRight;
    if (allyTeam.startRectBottom !== undefined) entry.startrectbottom = allyTeam.startRectBottom;
    ctx.allyTeams.push(entry);

    const allyTeamHasHuman = Object.values(allyTeam.teams).some((t) => !t.ai);

    for (const [teamKey, teamDef] of Object.entries(allyTeam.teams)) {
        processTeam(ctx, atIdx, allyTeamHasHuman, teamKey, teamDef, playerHandicap, enemyHandicap);
    }
}

/**
 * Returns the names of all human (non-AI) team slots in the mission, in definition order.
 *
 * For single-player missions this is always a one-element array.
 * Future co-op callers use this list to present slot selection to the player;
 * the chosen name is then passed as `localPlayerTeamName` to {@link missionToScriptStr}.
 */
export function missionHumanTeamNames(mission: MissionModel): string[] {
    const names: string[] = [];
    for (const allyTeam of Object.values(mission.allyTeams)) {
        names.push(...humanTeamNamesForAllyTeam(allyTeam));
    }
    return names;
}

/**
 * Converts a {@link MissionModel} to a Spring start-script game object.
 *
 * All non-AI team slots become {@link Player} entries whose `name` is the
 * mission-defined team name. `myplayername` is set to `localPlayerTeamName`
 * (the slot the local client occupies). For single-player missions pass
 * `missionHumanTeamNames(mission)[0]`; future co-op callers pass the
 * server-assigned slot name.
 *
 * The name→index maps for allyTeams, teams, ais, and players are encoded
 * into `modoptions.missionoptions` (base64 JSON) for consumption by the
 * game's Lua mission API.
 */
function missionToGame(
    mission: MissionModel,
    difficulty: MissionDifficulty | undefined,
    effectiveSettings: MissionEffectiveSettings,
    localPlayerTeamName: string,
    gameVersion: string,
    mapNameOverride?: string
): Game {
    const ctx: GameBuildContext = {
        allyTeams: [],
        teams: [],
        players: [],
        bots: [],
        allyTeamsMap: {},
        teamsMap: {},
        aisMap: {},
        playersMap: {},
        allyTeamIdx: 0,
        teamIdx: 0,
        playerIdx: 0,
        botIdx: 0,
    };

    const playerHandicap = difficulty?.playerhandicap ?? 0;
    const enemyHandicap = difficulty?.enemyhandicap ?? 0;

    for (const [allyTeamName, allyTeam] of Object.entries(mission.allyTeams)) {
        processAllyTeam(ctx, allyTeamName, allyTeam, playerHandicap, enemyHandicap);
    }

    const missionOptions = {
        missionScriptPath: mission.missionScriptPath,
        difficulty: difficulty?.name ?? "",
        disableFactionPicker: effectiveSettings.disableFactionPicker,
        disableInitialCommanderSpawn: effectiveSettings.disableInitialCommanderSpawn,
        allyTeams: ctx.allyTeamsMap,
        teams: ctx.teamsMap,
        ais: ctx.aisMap,
        players: ctx.playersMap,
    };

    // Spring.GetModOptions() lowercases the outer modoption key ("missionoptions") but the decoded JSON retains its original casing
    console.log("[mission-script-converter] missionoptions:", JSON.stringify(missionOptions, null, 2));

    // Restrictions must be serialised as a flat indexed object so that
    // stringifyScriptObj produces the [restrict] { unit0=...; limit0=...; } format.
    const unitLimitEntries = Object.entries(mission.unitLimits);
    const restrict =
        unitLimitEntries.length > 0
            ? Object.fromEntries([
                  ["numrestrictions", unitLimitEntries.length],
                  ...unitLimitEntries.flatMap(([unitid, limit], i) => [
                      [`unit${i}`, unitid],
                      [`limit${i}`, limit],
                  ]),
              ])
            : undefined;

    return {
        gametype: gameVersion,
        mapname: mapNameOverride ?? mission.mapName,
        startpostype: startPosTypeToInt(mission.startPosType),
        ishost: 1,
        myplayername: localPlayerTeamName,
        modoptions: {
            ...mission.modOptions,
            missionoptions: btoa(JSON.stringify(missionOptions)),
        },
        ...(Object.keys(mission.mapOptions).length > 0 && { mapoptions: mission.mapOptions }),
        ...(restrict && { restrict }),
        allyTeams: ctx.allyTeams,
        teams: ctx.teams,
        players: ctx.players,
        ais: ctx.bots,
    } as unknown as Game;
}

/**
 * Builds a complete Spring start-script string for the given mission.
 */
export function missionToScriptStr(
    mission: MissionModel,
    difficulty: MissionDifficulty | undefined,
    effectiveSettings: MissionEffectiveSettings,
    localPlayerTeamName: string,
    gameVersion: string,
    mapNameOverride?: string
): string {
    return startScriptConverter.generateScriptString(missionToGame(mission, difficulty, effectiveSettings, localPlayerTeamName, gameVersion, mapNameOverride));
}

function startPosTypeToInt(type: string): number {
    switch (type) {
        case "fixed":
            return 0;
        case "random":
            return 1;
        case "chooseInGame":
            return 2;
        case "chooseBeforeGame":
        default:
            return 3;
    }
}
