import { Battler } from "@/model/battle/battler";
import { Bot } from "@/model/battle/bot";
import { Player } from "@/model/battle/player";
import { StartBox } from "@/model/battle/types";
import { ExcludeMethods } from "jaz-ts-utils";

export class AllyTeam {
    public readonly battlers: Array<Battler>;
    public readonly startBox?: StartBox;

    constructor(battlers: Battler[] = []) {
        this.battlers = battlers;
    }

    public addBattler(prop: ExcludeMethods<typeof Player.prototype> | ExcludeMethods<typeof Bot.prototype>) {
        if (this.hasBattler(prop.name)) {
            console.warn(`Tried to add player to team but player already added: ${prop.name}`);
            return;
        }

        if ("userId" in prop) {
            this.battlers.push(new Player(prop));
        } else {
            this.battlers.push(new Bot(prop));
        }
    }

    public hasBattler(name: string) : boolean;
    public hasBattler(userId: number) : boolean;
    public hasBattler(playerOrBot: Battler) : boolean;
    public hasBattler(prop: string | number | Battler) : boolean {
        if (typeof prop === "string") {
            return this.battlers.some(player => player.name === prop);
        } else if (typeof prop === "number") {
            return this.battlers.some(player => player instanceof Player && player.userId === prop);
        } else {
            return this.battlers.some(player => player === prop);
        }
    }
}