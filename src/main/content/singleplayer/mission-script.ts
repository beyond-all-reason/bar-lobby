// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { AllyTeam, Bot, Game, ModOptions, Player, Team } from "@main/model/start-script";
import { startScriptConverter } from "@main/utils/start-script-converter";
import type { MissionConfig, StartPosType } from "@shared/content/schema/mission-config";
import { encodeModoptionValue } from "@shared/startbox-modoptions";

// The engine's startpostype for each of the schema's start position types, so a new one doesn't compile until it's mapped.
const START_POS_TYPES = { fixed: 0, random: 1, "in-game": 2, "in-client": 3 } satisfies Record<StartPosType, number>;

// The Mission API finds teams and alliances by these names, read from the sections' custom keys.
type NamedAllyTeam = AllyTeam & { name: string; ally0?: number };
type NamedTeam = Team & { name: string };

export type MissionScriptOptions = {
    // The mission archive's name as the engine knows it (archiveGameName), so the engine loads the mutator.
    archiveName: string;
    mapName: string;
    config: MissionConfig;
    // The mission's Lua inside the archive (missionLuaPath).
    entryPoint: string;
    playerName: string;
};

/**
 * The start script for one player playing a mission. Every team is led by that player, including the ones the
 * mission drives itself with no player or AI on them.
 */
export async function missionStartScript({ archiveName, mapName, config, entryPoint, playerName }: MissionScriptOptions): Promise<string> {
    const allianceNames = Object.keys(config.alliances);
    const allyTeams: NamedAllyTeam[] = allianceNames.map((alliance, index) => {
        const settings = config.allianceSettings?.[alliance];
        const ally = settings?.alliedWith === undefined ? undefined : allianceNames.indexOf(settings.alliedWith);

        return {
            id: String(index),
            name: alliance,
            numallies: ally === undefined ? 0 : 1,
            ally0: ally,
            startrecttop: settings?.startRectTop,
            startrectleft: settings?.startRectLeft,
            startrectbottom: settings?.startRectBottom,
            startrectright: settings?.startRectRight,
        };
    });

    const teamNames = allianceNames.flatMap((alliance, allyIndex) => config.alliances[alliance].map((team) => ({ team, allyIndex })));
    const teams: NamedTeam[] = teamNames.map(({ team, allyIndex }, index) => {
        const settings = config.teamSettings?.[team];

        return {
            id: String(index),
            name: team,
            allyteam: String(allyIndex),
            teamleader: "0",
            side: settings?.side,
            rgbcolor: settings?.rgbColor?.join(" "),
            incomemultiplier: settings?.incomeMultiplier,
            startposx: settings?.startPosX,
            startposz: settings?.startPosZ,
        };
    });
    const teamId = (team: string) => String(teamNames.findIndex((entry) => entry.team === team));

    const players: Player[] = [{ id: "0", name: playerName, team: teamId(config.playerTeam[0]) }];
    const ais: Bot[] = teamNames
        .flatMap(({ team }) => {
            const luaAI = config.teamSettings?.[team]?.luaAI;

            return luaAI ? [{ team: teamId(team), shortname: luaAI, host: "0", name: team }] : [];
        })
        .map((ai, index) => ({ id: String(index), ...ai }));

    const modOptions = { ...config.modOptions };
    // The Mission API needs Gaia's team, so a config can't turn it off.
    if ([0, false, "0"].includes(modOptions.luagaia)) {
        delete modOptions.luagaia;
    }
    const restrictions = Object.entries(config.restrictions ?? {});

    const game: Game = {
        gametype: archiveName,
        mapname: mapName,
        myplayername: playerName,
        ishost: 1,
        startpostype: config.startPosType === undefined ? undefined : START_POS_TYPES[config.startPosType],
        // The model lists only the engine's own keys; a game's modoptions are its own.
        modoptions: { ...modOptions, missionoptions: await encodeModoptionValue({ entryPoint }) } as ModOptions,
        mapoptions: config.mapOptions,
        numrestrictions: restrictions.length || undefined,
        allyTeams,
        teams,
        players,
        ais: ais.length > 0 ? ais : undefined,
    };

    // The engine reads restrictions as numbered unit and limit pairs, not as a list.
    const restrict = Object.fromEntries(
        restrictions.flatMap(([unit, limit], index) => [
            [`unit${index}`, unit],
            [`limit${index}`, limit],
        ])
    );

    return startScriptConverter.generateScriptString(restrictions.length > 0 ? Object.assign(game, { restrict }) : game);
}
