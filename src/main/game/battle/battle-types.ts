import { MapData } from "@main/content/maps/map-data";
import { User } from "@main/model/user";

export interface Battle {
    title: string;
    isOnline: boolean;
    battleOptions: BattleOptions;
    me: Player;
    teams: Array<Array<Player | Bot>>;
    spectators: Player[];
    started: boolean;
}

export interface BattleWithMetadata extends Battle {
    startTime?: Date;
    participants: Array<Player | Bot>;
}

export type GameMode = {
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: Record<string, any>;
};

export type BattleOptions = {
    engineVersion?: string;
    gameVersion?: string;
    gameMode: GameMode;
    map?: MapData;
    mapOptions: {
        startPosType: StartPosType;
        startBoxesIndex?: number;
        fixedPositionsIndex?: number;
    };
    restrictions: Restriction[];
};

export type SpadsBattleOptions = {
    id: number;
    isHost: boolean;
    passworded: boolean;
    password: string | null;
    scriptPassword: string | null;
    founderId: number;
    ip: string | null;
    port: number | null;
    locked: boolean;
    maxPlayers: number;
    preset: string;
    joinQueueUserIds: number[];
    autoBalance: string;
    teamSize: number;
    nbTeams: number;
    balanceMode: string;
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

export type Player = {
    id: number;
    name: string;
    user: User;
    contentSyncState: {
        engine: number;
        game: number;
        map: number;
    };
    inGame: boolean;

    faction?: Faction;
    startPos?: { x: number; z: number };
    handicap?: number;
    advantage?: number;
    incomeMultiplier?: number;
    color?: string;
};

export type Bot = {
    id: number;
    ownerUserId: number;
    aiShortName: string; // TODO: point directly to AI obj and object.freeze it?
    name: string;
    aiOptions: Record<string, unknown>;

    faction?: Faction;
    startPos?: { x: number; z: number };
    handicap?: number;
    advantage?: number;
    incomeMultiplier?: number;
    color?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isBot(bot: any): bot is Bot {
    return "aiShortName" in bot;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPlayer(player: any): player is Player {
    return "user" in player;
}
