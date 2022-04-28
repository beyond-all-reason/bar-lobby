import { Team } from "@/model/battle/team";
import { Faction } from "@/model/battle/types";

export type BattleUser = { userId: number };

export type Contender = {
    id: number;
    team: Team;
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
    aiShortName: string; // TODO: point directly to AI obj and object.freeze it?
    name: string;
    aiOptions?: Record<string, unknown>;
    faction?: Faction;
};

export type Spectator = BattleUser & {
    type: "spectator";
};