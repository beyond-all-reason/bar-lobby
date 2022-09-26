import { Generated, Selectable } from "kysely";
import { DemoModel } from "sdfz-demo-parser";

export type ReplayData = {
    replayId: Generated<number>;
    gameId: string;
    fileName: string;
    engineVersion: string;
    gameVersion: string;
    mapScriptName: string;
    startTime: Date;
    gameDurationMs: number;
    gameEndedNormally: boolean;
    chatlog?: DemoModel.ChatMessage[];
    hasBots: boolean;
    preset: "duel" | "team" | "ffa" | "teamffa";
    winningTeamId: number;
    teams: DemoModel.Info.AllyTeam[];
    contenders: (DemoModel.Info.Player | DemoModel.Info.AI)[];
    spectators: DemoModel.Info.Spectator[];
    script: string;
    battleSettings: Record<string, string>;
    hostSettings?: Record<string, string>;
    gameSettings: Record<string, string>;
    mapSettings: Record<string, string>;
};

export type SelectableReplayData = Selectable<ReplayData>;

export type ReplayPreviewData = {
    id: number;
    fileName: string;
    title: string;
    date: string;
    duration: string;
    map: string;
    game: string;
    engine: string;
};
