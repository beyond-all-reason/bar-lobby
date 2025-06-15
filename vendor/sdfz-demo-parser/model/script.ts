// SPDX-FileCopyrightText: 2024 Jazcash
// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT AND Unlicense
// SPDX-FileAttributionText: Original code from https://github.com/beyond-all-reason/demo-parser

/* eslint-disable @typescript-eslint/no-namespace */
import { DemoModel } from "./demo-model";

export namespace Script {
    export interface Script {
        hostOptions: HostOptions;
        gameOptions: GameOptions;
        mapOptions: MapOptions;
        spadsOptions?: SpadsOptions;
        allyTeams: AllyTeam[];
        players: Player[];
        ais: AI[];
        spectators: Spectator[];
    }

    export interface HostOptions {
        [key: string]: any;
    }

    export interface GameOptions {
        [key: string]: any;
    }

    export interface MapOptions {
        [key: string]: any;
    }

    export interface SpadsOptions {
        [key: string]: any;
    }

    export interface AllyTeam {
        [key: string]: any;
        allyTeamId: number;
        startBox?: {
            top: number;
            bottom: number;
            left: number;
            right: number;
        };
    }

    export interface Team {
        [key: string]: any;
        teamId: number;
        teamLeaderId: number;
        rgbColor: number[];
        allyTeamId: number;
        handicap: number;
        faction: string;
    }

    export interface Player {
        [key: string]: any;
        playerId: number;
        teamId: number;
        allyTeamId: number;
        name: string;
        faction: string;
        rank: number;
        rgbColor: { r: number; g: number; b: number };
        handicap: number;
        isFromDemo?: boolean;
        countryCode?: string;
        userId?: number;
        skill?: string;
        skillclass?: number;
        skillUncertainty?: number;
        startPos?: DemoModel.Command.Type.MapPos;
    }

    export type Spectator = Omit<Player, "teamId" | "allyTeamId" | "rgbColor" | "handicap" | "faction" | "startPos">;

    export interface AI {
        [key: string]: any;
        aiId: number;
        teamId: number;
        allyTeamId: number;
        name: string;
        shortName: string;
        host: boolean;
        faction: string;
        rgbColor: { r: number; g: number; b: number };
        handicap: number;
        isFromDemo?: boolean;
        version?: string;
        startPos?: DemoModel.Command.Type.MapPos;
        options?: { [key: string]: string };
    }
}
