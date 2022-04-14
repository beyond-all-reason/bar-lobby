import { Bot } from "@/model/battle/bot";
import { Player } from "@/model/battle/player";

export interface Spectator {
    userId: number;
}

export function isSpectator(battler: Player | Bot | Spectator) : battler is Spectator {
    return "userId" in battler && "";
}