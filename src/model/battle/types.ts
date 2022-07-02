import { EngineVersionFormat, GameVersionFormat } from "@/model/formats";

export type BattleOptions = {
    id: number;
    title: string;
    engineVersion: EngineVersionFormat;
    gameVersion: GameVersionFormat;
    map: string;
    isHost: boolean;
    startPosType: StartPosType;
    startBoxes: StartBox[];
    gameOptions: Record<string, string | number | boolean>;
    mapOptions: Record<string, string | number | boolean>;
    restrictions: Restriction[];
};

export type StartBox = {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
};

export enum StartPosType {
    Fixed = 0,
    Random = 1,
    Boxes = 2,
}

export enum Faction {
    Armada = "Armada",
    Cortex = "Cortex",
    Legion = "Legion",
    Raptors = "Raptors",
    Scavengers = "Scavengers",
}

export enum TeamPreset {
    Standard,
    FFA,
    TeamFFA,
    Custom,
}

export type Restriction = {
    unitDefId: string;
    limit: number;
};
