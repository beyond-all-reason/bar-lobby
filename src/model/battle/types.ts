import { EngineVersionFormat } from "@/model/formats";

export type BattleOptions = {
    offline: boolean;
    engineVersion: EngineVersionFormat;
    gameVersion: string;
    mapFileName: string;
    isHost: boolean;
    startPosType: StartPosType;
    teamPreset: TeamPreset;
};

export type StartBox = {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
};

export enum StartPosType {
    Fixed,
    Random,
    ChooseInGame,
    ChooseBeforeGame
}

export enum Faction {
    Armada = "Armada",
    Cortex = "Cortex",
    Legion = "Legion",
    Raptors = "Raptors",
    Scavengers = "Scavengers"
}

export enum TeamPreset {
    Standard,
    FFA,
    Custom
}

export type Restriction = {
    unitDefId: string;
    limit: number;
};