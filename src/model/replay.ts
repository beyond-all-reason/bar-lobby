import { Generated } from "kysely";
import { DemoModel } from "sdfz-demo-parser";

import { StartPosType } from "@/model/battle/types";

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
    startPosType: StartPosType;
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
