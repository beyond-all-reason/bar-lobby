// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { EngineAI } from "@main/content/engine/engine-version";
import type { GameAI } from "@main/content/game/game-version";
import type { MapData } from "@main/content/maps/map-data";
import { Bot, Faction, Player, Team } from "@main/game/battle/battle-types";

const PLAYERS_PER_TEAM = 3;
const TEAM_COUNT = 2;
const TOTAL_PARTICIPANTS = PLAYERS_PER_TEAM * TEAM_COUNT;

export const BEGINNER_SKIRMISH_AI_SHORT_NAME = "BARb";

export type EligibleBeginnerSkirmishMap = {
    map: MapData;
    startBoxesIndex: number;
};

export function getEligibleBeginnerSkirmishMaps(maps: MapData[]): EligibleBeginnerSkirmishMap[] {
    return maps.flatMap((map) => {
        if (!map.tags.includes("3v3") || map.playerCountMin > TOTAL_PARTICIPANTS || map.playerCountMax < TOTAL_PARTICIPANTS) return [];

        return map.startboxesSet.flatMap((startBoxSet, startBoxesIndex) => {
            if (startBoxSet.startboxes.length !== TEAM_COUNT || startBoxSet.maxPlayersPerStartbox < PLAYERS_PER_TEAM) return [];
            return [{ map, startBoxesIndex }];
        });
    });
}

export function selectBeginnerSkirmishMap(maps: MapData[], random: () => number = Math.random): EligibleBeginnerSkirmishMap | undefined {
    const eligibleMaps = getEligibleBeginnerSkirmishMaps(maps);
    if (eligibleMaps.length === 0) return undefined;
    return eligibleMaps[Math.min(Math.floor(random() * eligibleMaps.length), eligibleMaps.length - 1)];
}

export function createBeginnerSkirmishTeams({ player, ai, nextParticipantId }: { player: Player; ai: EngineAI | GameAI; nextParticipantId: () => number }): Team[] {
    const configuredPlayer: Player = {
        ...player,
        faction: Faction.Armada,
    };

    const createBot = (number: number): Bot => ({
        id: nextParticipantId(),
        name: `${ai.name} ${number}`,
        aiShortName: ai.shortName,
        aiOptions: {
            difficultyLevel: 0,
        },
        faction: Faction.Armada,
        host: player.id,
    });

    return [
        {
            participants: [configuredPlayer, createBot(1), createBot(2)],
        },
        {
            participants: [createBot(3), createBot(4), createBot(5)],
        },
    ];
}
