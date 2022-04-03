import { Battler, BattlerConfig } from "@/model/battle/battler";
import { Faction } from "@/model/battle/types";
import { SetOptional } from "type-fest";

export interface BotConfig extends BattlerConfig {
    ai: string;
    ownerName: string;
    faction: Faction;
}

export class Bot extends Battler implements BotConfig {
    public ai: string;
    public ownerName: string;
    public faction: Faction;

    constructor(config: SetOptional<BotConfig, "faction">) {
        super(config);

        this.ai = config.ai;
        this.ownerName = config.ownerName;
        this.faction = config.faction ?? Faction.Armada;
    }
}
