// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { DemoModel } from "$/sdfz-demo-parser";

export type Replay = {
    gameId: string;
    fileName: string;
    filePath: string;
    engineVersion: string;
    gameVersion: string;
    mapSpringName: string;
    startTime: Date;
    gameDurationMs: number;
    gameEndedNormally: 0 | 1;
    chatlog: DemoModel.ChatMessage[] | null;
    hasBots: 0 | 1;
    preset: "duel" | "team" | "ffa" | "teamffa";
    winningTeamId: number;
    teams: DemoModel.Info.AllyTeam[];
    contenders: (DemoModel.Info.Player | DemoModel.Info.AI)[];
    spectators: DemoModel.Info.Spectator[];
    script: string;
    battleSettings: Record<string, string>;
    hostSettings: Record<string, string>;
    gameSettings: Record<string, string>;
    mapSettings: Record<string, string>;
};

export type OngoingBattle = {
    title: string;
    gameId: string;
    engineVersion: string;
    gameVersion: string;
    mapSpringName: string;
    startTime: Date;
    hasBots: 0 | 1;
    preset: "duel" | "team" | "ffa" | "teamffa";
    teams: DemoModel.Info.AllyTeam[];
    contenders: (DemoModel.Info.Player | DemoModel.Info.AI)[];
    spectators: DemoModel.Info.Spectator[];
    script: string;
    battleSettings: Record<string, string>;
    hostSettings: Record<string, string>;
    gameSettings: Record<string, string>;
    mapSettings: Record<string, string>;
};
