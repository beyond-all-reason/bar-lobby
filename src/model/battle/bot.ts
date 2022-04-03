import { AllyTeam } from "@/model/battle/ally-team";
import { Battler } from "@/model/battle/battler";
import { Faction } from "@/model/battle/types";

export class Bot extends Battler {
    public ai: string;
    public ownerName: string;
    public faction: Faction;

    constructor(allyTeam: AllyTeam, name: string, ai: string, ownerName: string, faction: Faction) {
        super(allyTeam, name);
        this.ai = ai;
        this.ownerName = ownerName;
        this.faction = faction;
    }
}
