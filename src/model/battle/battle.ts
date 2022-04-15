import { AllyTeam } from "@/model/battle/ally-team";
import { Player, Bot, Spectator } from "@/model/battle/participants";
import { BattleOptions, Restriction } from "@/model/battle/types";
import { SetOptional } from "type-fest";

export interface Battle {
    battleOptions: BattleOptions;
    allyTeams: AllyTeam[];
    participants: Array<Player | Bot | Spectator>;
    gameOptions: Record<string, string | number | boolean>;
    mapOptions: Record<string, string | number | boolean>;
    restrictions: Restriction[];
}

export type CreateBattleConfig = SetOptional<Battle, "allyTeams" | "gameOptions" | "mapOptions" | "restrictions">;

export function createBattle(config: CreateBattleConfig) : Battle {
    return {
        battleOptions: config.battleOptions,
        allyTeams: config.allyTeams ?? [],
        participants: config.participants,
        gameOptions: config.gameOptions ?? {},
        mapOptions: config.mapOptions ?? {},
        restrictions: config.restrictions ?? [],
    };
}

export function validateBattle(battle: Battle) : boolean {
    // unique names
    // unique ids
    // unique allyTeamIds
    // valid ownerId

    return true;
}