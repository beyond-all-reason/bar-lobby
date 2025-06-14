import { MapData } from "@main/content/maps/map-data";
import { User } from "@main/model/user";
import { StartBox } from "tachyon-protocol/types";

export interface Battle {
    title: string;
    isOnline: boolean;
    battleOptions: BattleOptions;
    me?: Player;
    teams: Array<Team>;
    spectators: Player[];
    started: boolean;
}

export interface BattleWithMetadata extends Battle {
    startTime?: Date;
    participants: Array<Player | Bot>;
    bots: Bot[];
    players: Player[];
}

export type GameModeID = "CLASSIC" | "SKIRMISH" | "RAPTORS" | "SCAVENGERS" | "FFA";
export type GameModeLabel = "Classic" | "Skirmish" | "Raptors" | "Scavengers" | "FFA";

export const GameMode: Record<GameModeID, GameModeLabel> = {
    CLASSIC: "Classic",
    SKIRMISH: "Skirmish",
    RAPTORS: "Raptors",
    SCAVENGERS: "Scavengers",
    FFA: "FFA",
};

export type GameModeWithOptions = {
    label: GameModeLabel;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: Record<string, any>;
};

export enum StartBoxOrientation {
    EastVsWest = "EastVsWest",
    NorthVsSouth = "NorthVsSouth",
    NortheastVsSouthwest = "NortheastVsSouthwest",
    NorthwestVsSoutheast = "NorthwestVsSoutheast",
}

export type BattleOptions = {
    engineVersion?: string;
    gameVersion?: string;
    gameMode: GameModeWithOptions;
    map?: MapData;
    mapOptions: {
        startPosType: StartPosType;
        startBoxesIndex?: number;
        customStartBoxes?: StartBox[];
        customStartBoxPreset?: StartBoxOrientation;
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

export enum StartPosType {
    /** automatic spawning using default map start positions, in fixed order */
    Fixed = 0,
    /** automatic spawning using default map start positions, in random order */
    Random = 1,
    /** manual spawning based on positions chosen by players in start boxes */
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
    host: number;
    aiShortName: string;
    name: string;
    aiOptions: Record<string, unknown>;

    faction?: Faction;
    startPos?: { x: number; z: number };
    handicap?: number;
    advantage?: number;
    incomeMultiplier?: number;
    color?: string;
};

export type Team = {
    participants: Array<Player | Bot>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isBot(bot: any): bot is Bot {
    return "aiShortName" in bot;
}

export function isRaptor(bot: Bot): boolean {
    return bot.aiShortName === "RaptorsAI";
}

export function isScavenger(bot: Bot): boolean {
    return bot.aiShortName === "ScavengersAI";
}

export function isScavengerOrRaptor(p: Bot | Player): boolean {
    return isBot(p) && (isScavenger(p) || isRaptor(p));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPlayer(player: any): player is Player {
    return "user" in player;
}
