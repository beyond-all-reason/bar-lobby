import { DemoParser } from "$/sdfz-demo-parser";
import { Replay } from "@main/content/replays/replay";
import path from "path";
import { Worker } from "worker_threads";

const demoParser = new DemoParser();

export async function parseReplay(replayPath: string) {
    const replayData = await demoParser.parseDemo(replayPath);

    const numOfPlayers = replayData.info.players.length + replayData.info.ais.length;
    let preset: "duel" | "team" | "ffa" | "teamffa" = "duel";
    if (replayData.info.allyTeams.length > 2 && replayData.info.players.some((player) => player.playerId !== player.allyTeamId)) {
        preset = "teamffa";
    } else if (replayData.info.allyTeams.length > 2) {
        preset = "ffa";
    } else if (numOfPlayers > 2) {
        preset = "team";
    }

    return {
        gameId: replayData.header.gameId,
        fileName: path.parse(replayPath).base,
        filePath: replayPath,
        engineVersion: replayData.info.meta.engine,
        gameVersion: replayData.info.meta.game,
        mapScriptName: replayData.info.meta.map,
        startTime: replayData.info.meta.startTime,
        gameDurationMs: replayData.info.meta.durationMs,
        gameEndedNormally: replayData.info.meta.winningAllyTeamIds.length > 0 ? 1 : 0,
        chatlog: replayData.chatlog || null,
        hasBots: replayData.info.ais.length > 0 ? 1 : 0,
        preset: preset,
        winningTeamId: replayData.info.meta.winningAllyTeamIds[0],
        teams: replayData.info.allyTeams,
        contenders: [...replayData.info.players, ...replayData.info.ais],
        spectators: replayData.info.spectators,
        script: replayData.script,
        battleSettings: replayData.info.hostSettings,
        gameSettings: replayData.info.gameSettings,
        mapSettings: replayData.info.mapSettings,
        hostSettings: replayData.info.spadsSettings ?? {},
    } as Replay;
}

export function asyncParseReplay(replayFilePath: string): Promise<Replay> {
    return new Promise<Replay>((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, "parse-replay-worker.cjs"), {
            workerData: { replayFilePath },
        });
        worker.on("message", resolve);
        worker.on("error", reject);
        worker.on("exit", (code) => {
            if (code !== 0) reject(new Error(`parse-replay-worker stopped with exit code ${code}`));
        });
    });
}
