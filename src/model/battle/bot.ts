import { Battler, BattlerConfig } from "@/model/battle/battler";
import { Player } from "@/model/battle/player";
import { Faction } from "@/model/battle/types";
import { SetOptional } from "type-fest";

export interface BotConfig extends BattlerConfig {
    aiShortName: string;
    owner: Player;
    faction: Faction;
    name: string;
}

export class Bot extends Battler implements BotConfig {
    public aiShortName: string;
    public name: string;
    public owner: Player;
    public faction: Faction;

    constructor(config: SetOptional<BotConfig, "faction">) {
        super(config);

        this.aiShortName = config.aiShortName;
        this.owner = config.owner;
        this.faction = config.faction ?? Faction.Armada;
        this.name = config.name;
    }
}
