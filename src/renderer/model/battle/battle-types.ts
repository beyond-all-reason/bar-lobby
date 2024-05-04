import { TachyonUser } from "tachyon-protocol";

export type BattleUser = BattlePlayer | BattleSpectator;
export type BattlePlayer = TachyonUser & { battleStatus: { isSpectator: false } };
export type BattleSpectator = TachyonUser & { battleStatus: { isSpectator: true } };

export type BattleOptions = {
    title: string;
    engineVersion: string;
    gameVersion: string;
    map: string;
    startPosType: StartPosType;
    startBoxes: Record<number, StartBox>;
    startTime: Date | null;
    gameOptions: Record<string, string | number | boolean>;
    mapOptions: Record<string, string | number | boolean>;
    restrictions: Restriction[];
};

export type CustomBattleOptions = BattleOptions;

export type OfflineCustomBattleOptions = CustomBattleOptions;

export type OnlineBattleOptions = BattleOptions & {
    id: number;
    isHost: boolean;
    ip: string | null;
    port: number | null;
    hostId: number;
    scriptPassword: string | null;
};

export type OnlineCustomBattleOptions = OnlineBattleOptions &
    CustomBattleOptions & {
        passworded: boolean;
        locked: boolean;
        maxPlayers: number;
        preset: string;
        joinQueueUserIds: number[];
        autoBalance: string;
        teamSize: number;
        nbTeams: number;
        balanceMode: string;
    };

export type MatchmakingBattleOptions = OnlineBattleOptions;

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

export type BattleContenderConfig = {
    playerId: number;
    teamId: number;
    startPos?: { x: number; z: number };
    handicap?: number;
    advantage?: number;
    incomeMultiplier?: number;
    color?: string;
};

export type Bot = BattleContenderConfig & {
    ownerUserId: number;
    aiShortName: string; // TODO: point directly to AI obj and object.freeze it?
    name: string;
    aiOptions: Record<string, unknown>;
    faction?: Faction;
};
