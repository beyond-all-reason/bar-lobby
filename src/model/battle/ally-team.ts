import { Bot } from "@/model/battle/bot";
import { Player } from "@/model/battle/player";
import { StartBox } from "@/model/battle/types";

export interface AllyTeam {
    players: Player[];
    bots: Bot[];
    startBox?: StartBox;
}