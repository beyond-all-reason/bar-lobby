import { Battler } from "@/model/battle/battler";

export interface Player extends Battler {
    userId: number;
}