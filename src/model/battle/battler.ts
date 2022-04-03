import { AllyTeam } from "@/model/battle/ally-team";
import { ExcludeMethods } from "jaz-ts-utils";

/** Battler the base class for Player and Bot */
export abstract class Battler {
    public readonly allyTeam!: AllyTeam;
    public name!: string;
    public startPos?: { x: number, z: number };
    public handicap?: number;
    public advantage?: number;
    public incomeMultiplier?: number;

    constructor(args: ExcludeMethods<typeof Battler.prototype>) {
        Object.assign(this, args);
    }
}