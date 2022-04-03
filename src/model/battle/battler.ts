import { AllyTeam } from "@/model/battle/ally-team";

export interface BattlerConfig {
    allyTeam: AllyTeam;
    name: string;
    startPos?: { x: number, z: number };
    handicap?: number;
    advantage?: number;
    incomeMultiplier?: number;
}

/** Battler is the base class for Player and Bot */
export abstract class Battler implements BattlerConfig {
    public allyTeam: AllyTeam;
    public name: string;
    public startPos?: { x: number, z: number };
    public handicap?: number;
    public advantage?: number;
    public incomeMultiplier?: number;

    constructor(config: BattlerConfig) {
        this.allyTeam = config.allyTeam;
        this.name = config.name;
    }
}