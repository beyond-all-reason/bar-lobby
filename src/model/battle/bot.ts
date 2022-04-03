import { AI } from "@/model/ai";
import { Battler, BattlerConfig } from "@/model/battle/battler";
import { Player } from "@/model/battle/player";
import { Faction } from "@/model/battle/types";
import { SetOptional } from "type-fest";

export interface BotConfig extends BattlerConfig {
    ai: AI;
    owner: Player;
    faction: Faction;
    name: string;
}

export class Bot extends Battler implements BotConfig {
    public ai: AI;
    public owner: Player;
    public faction: Faction;
    public name: string;

    constructor(config: SetOptional<BotConfig, "faction">) {
        super(config);

        this.ai = config.ai;
        this.owner = config.owner;
        this.faction = config.faction ?? Faction.Armada;
        this.name = config.name;
    }
}
