import { Battler } from "@/model/battle/battler";
import { Player } from "@/model/battle/player";
import { Spectator } from "@/model/battle/spectator";
import { Faction } from "@/model/battle/types";

export interface Bot extends Battler {
    aiShortName: string;
    name: string;
    ownerName: string;
    faction?: Faction;
}

export function isBot(obj: Player | Bot | Spectator) : obj is Bot {
    return "aiShortName" in obj;
}