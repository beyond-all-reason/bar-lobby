import { ais } from "@/config/ais";

export type BattleType = {
    battleOptions: BattleOptions;
    allyTeams: AllyTeam[];
    spectators?: Spectator[];
};

export type BattleOptions = {
    gameVersion: string;
    mapName: string;
    isHost: boolean;
    myPlayerName: string;
    startPosType?: StartPosType;
};

export type AllyTeam = {
    teams: Team[];
    startBox?: StartBox;
};

export type Team = {
    players: Array<Player | AIPlayer>;
};

export type Player = {
    name: string;
    userId?: number;
    startPos?: { x: number, z: number };
    handicap?: number;
    advantage?: number;
    incomeMultiplier?: number;
};

export type AIPlayer = Omit<Player, "userId"> & {
    aiType: keyof typeof ais;
    faction: Faction;
};

export type Spectator = {
    userId: number;
    name: string;
};

export type StartBox = {
    top: number;
    left: number;
    bottom: number;
    right: number;
};

export enum StartPosType {
    Fixed,
    Random,
    ChooseInGame,
    ChooseBeforeGame
}

export enum Faction {
    Armada = "Armada",
    Cortex = "Cortex"
}