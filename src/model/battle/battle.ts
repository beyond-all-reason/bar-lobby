import { AllyTeam } from "@/model/battle/ally-team";
import { Spectator } from "@/model/battle/spectator";
import { BattleOptions, Restriction } from "@/model/battle/types";
import { SetOptional } from "type-fest";

export interface Battle {
    battleOptions: BattleOptions;
    allyTeams: AllyTeam[];
    spectators: Spectator[];
    gameOptions: Record<string, string | number | boolean>;
    mapOptions: Record<string, string | number | boolean>;
    restrictions: Restriction[];
}

export type CreateBattleConfig = SetOptional<Battle, "allyTeams" | "spectators" | "gameOptions" | "mapOptions" | "restrictions">;

export function createBattle(config: CreateBattleConfig) : Battle {
    return {
        battleOptions: config.battleOptions,
        allyTeams: config.allyTeams ?? [],
        spectators: config.spectators ?? [],
        gameOptions: config.gameOptions ?? {},
        mapOptions: config.mapOptions ?? {},
        restrictions: config.restrictions ?? [],
    };
}