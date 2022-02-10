import { AIConfig } from "@/model/ai";

export type Player = {
    userId: number;
    name: string;
    playerId: number;
    teamId: number;
    allyId: number;
    startPos?: { x: number, z: number };
    handicap?: number;
    advantage?: number;
    incomeMultiplier?: number;
};

export type AIPlayer = Omit<Player, "isSpectator" | "userId"> & {
    ownerPlayerId: number;
    aiConfig: AIConfig;
};

export type Spectator = {
    userId: number;
    name: string;
};