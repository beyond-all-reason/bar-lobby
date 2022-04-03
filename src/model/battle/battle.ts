import { AllyTeam, AllyTeamConfig } from "@/model/battle/ally-team";
import { Spectator } from "@/model/battle/spectator";
import { BattleOptions, Restriction } from "@/model/battle/types";
import type { SetOptional } from "type-fest";

export interface BattleConfig {
    battleOptions: BattleOptions;
    allyTeams: AllyTeam[];
    spectators: Spectator[];
    gameOptions?: Record<string, string | number | boolean>;
    mapOptions?: Record<string, string | number | boolean>;
    restrictions?: Restriction[];
}

export class Battle implements BattleConfig {
    static fromConfig(config: BattleConfig) {

    }

    public battleOptions: BattleOptions;
    public allyTeams: AllyTeam[];
    public spectators: Spectator[];
    public gameOptions: Record<string, string | number | boolean>;
    public mapOptions: Record<string, string | number | boolean>;
    public restrictions: Restriction[];

    constructor(config: SetOptional<BattleConfig, "allyTeams" | "spectators" | "gameOptions" | "mapOptions" | "restrictions">) {
        this.battleOptions = config.battleOptions;
        this.allyTeams = config.allyTeams ?? [];
        this.spectators = config.spectators ?? [];
        this.gameOptions = config.gameOptions ?? {};
        this.mapOptions = config.mapOptions ?? {};
        this.restrictions = config.restrictions ?? [];
    }

    public addAllyTeam(allyTeamConfig: SetOptional<AllyTeamConfig, "battlers">) {
        //
    }

    public getBattlers() {
        return this.allyTeams.flatMap(allyTeam => allyTeam.battlers);
    }
}