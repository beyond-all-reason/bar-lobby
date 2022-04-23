import { Faction } from "@/model/battle/types";

export type BattleUser = { userId: number };

export type Contender = {
    //id?: number; // TODO: is this even necessary?
    allyTeamId: number;
    startPos?: { x: number, z: number };
    handicap?: number;
    advantage?: number;
    incomeMultiplier?: number;
    color?: number;
};

export type Player = Contender & BattleUser & {
    type: "player";
};

export type Bot = Contender & {
    type: "bot";
    ownerUserId: number;
    aiShortName: string;
    name: string;
    faction?: Faction;
};

export type Spectator = BattleUser & {
    type: "spectator";
};