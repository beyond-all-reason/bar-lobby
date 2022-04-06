import { AllyTeam } from "@/model/battle/ally-team";
import { Battler, BattlerConfig } from "@/model/battle/battler";
import { Player } from "@/model/battle/player";
import { Spectator } from "@/model/battle/spectator";
import { Faction } from "@/model/battle/types";
import { SetOptional } from "type-fest";

export interface BotConfig extends BattlerConfig {
    name: string;
    aiShortName: string;
    ownerName: string;
    faction?: Faction;
}

export class Bot extends Battler implements Omit<BotConfig, "ownerName"> {
    public owner: Player | Spectator;
    public aiShortName: string;
    public name: string;
    public faction: Faction;

    protected ownerName: string;

    constructor(allyTeam: AllyTeam, owner: Player | Spectator, config: SetOptional<BotConfig, "faction">) {
        super(allyTeam, config);

        this.owner = owner;
        this.aiShortName = config.aiShortName;
        this.ownerName = config.ownerName;
        this.faction = config.faction ?? Faction.Armada;
        this.name = config.name;
    }
}
