import { AllyTeam } from "@/model/battle/ally-team";

export interface BattlerConfig {
    allyTeam: AllyTeam;
    startPos?: { x: number, z: number };
    handicap?: number;
    advantage?: number;
    incomeMultiplier?: number;
    color?: number;
}

/** Battler is the base class for Player and Bot */
export abstract class Battler implements BattlerConfig {
    public allyTeam: AllyTeam;
    public startPos?: { x: number, z: number };
    public handicap?: number;
    public advantage?: number;
    public incomeMultiplier?: number;
    public color?: number;

    constructor(config: BattlerConfig) {
        this.allyTeam = config.allyTeam;
        this.startPos = config.startPos;
        this.handicap = config.handicap;
        this.advantage = config.advantage;
        this.incomeMultiplier = config.incomeMultiplier;
        this.color = config.color;
    }
}