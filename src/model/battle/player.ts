import { Battler } from "@/model/battle/battler";
import { ExcludeMethods } from "jaz-ts-utils";

export class Player extends Battler {
    public userId!: number;

    constructor(args: ExcludeMethods<typeof Player.prototype>) {
        super(args);
    }
}