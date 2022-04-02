import type { EngineVersionFormat } from "@/model/formats";

export namespace BattleTypes {
    export type Battle = {
        hostOptions: HostOptions;
        allyTeams: AllyTeam[];
        spectators: Spectator[];
    };

    export type HostOptions = {
        engineVersion: EngineVersionFormat;
        gameVersion: string;
        mapFileName: string;
        isHost: boolean;
        myPlayerName: string;
        startPosType: StartPosType;
    };

    export type AllyTeam = {
        teams: Team[];
        startBox?: StartBox;
    };

    export type Team = {
        players: Player[];
        bots: Bot[]
    };

    export type Player = {
        name: string;
        userId: number;
        startPos?: { x: number, z: number };
        handicap?: number;
        advantage?: number;
        incomeMultiplier?: number;
    };

    export type Bot = Omit<Player, "userId"> & {
        ai: string;
        ownerName: string;
        faction: Faction;
    };

    export type Spectator = {
        userId: number;
        name: string;
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
        Cortex = "Cortex"
    }
}