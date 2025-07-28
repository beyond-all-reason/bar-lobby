// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { BarMatch, Replay } from "@main/content/replays/replay";
import path from "path";
import { isMainThread, parentPort } from "worker_threads";
import { readFile } from "fs/promises";
import { WASI } from "wasi";
import init from "./replay_parser.wasm?init";

enum ParseMode {
    HEADER_ONLY = 0,
    METADATA_ONLY = 1,
    METADATA_AND_STATS = 2,
    FULL_NO_CHAT = 3,
    FULL = 4,
}

interface WasmExports {
    memory: WebAssembly.Memory;
    init: () => void;
    cleanup: () => void;
    getOutput: () => number;
    alloc: (size: number) => number;
    parseDemoFileFromMemory: (fileDataPtr: number, fileDataLen: number, mode: number) => number;
    [key: string]: unknown;
}

let instance: WebAssembly.Instance | null = null;

async function parse(replayPath: string, mode: ParseMode = ParseMode.FULL) {
    if (!instance) {
        const wasi = new WASI({
            version: "preview1",
        });

        instance = await init({
            wasi_snapshot_preview1: wasi.wasiImport,
        });
        wasi.start(instance);
    }

    const exports = instance.exports as WasmExports;
    const fileBuffer = await readFile(replayPath);
    const fileDataPtr = exports.alloc(fileBuffer.length);

    if (fileDataPtr === 0) {
        throw new Error("Failed to allocate memory");
    }

    new Uint8Array(exports.memory.buffer, fileDataPtr, fileBuffer.length).set(fileBuffer);

    const outputLength = exports.parseDemoFileFromMemory(fileDataPtr, fileBuffer.length, mode);

    if (outputLength === 0) {
        exports.cleanup();
        exports.init();
        throw new Error("Failed to parse demo file");
    }

    const outputPtr = exports.getOutput();
    if (!outputPtr) {
        exports.cleanup();
        exports.init();
        throw new Error("Failed to get output");
    }

    const outputBuffer = new Uint8Array(exports.memory.buffer, outputPtr, outputLength);
    const barMatch = JSON.parse(new TextDecoder().decode(outputBuffer)) as BarMatch;

    exports.cleanup();
    exports.init();

    return barMatch;
}

if (isMainThread) {
    throw new Error("This script should be run in worker thread.");
} else {
    async function parseReplay(replayPath: string): Promise<Replay> {
        console.time(`Processing replay with WASM: ${replayPath}`);
        const barMatch = await parse(replayPath);
        console.timeEnd(`Processing replay with WASM: ${replayPath}`);

        const numOfPlayers = barMatch.game_config.players.filter((player) => player.spectator === 0).length;
        let preset: "duel" | "team" | "ffa" | "teamffa" = "duel";
        if (barMatch.game_config.allyteams.length > 2 && barMatch.game_config.players.some((player) => player.id !== player.team)) {
            preset = "teamffa";
        } else if (barMatch.game_config.allyteams.length > 2) {
            preset = "ffa";
        } else if (numOfPlayers > 2) {
            preset = "team";
        }
        return {
            gameId: barMatch.header.game_id,
            fileName: path.parse(replayPath).base,
            filePath: replayPath,
            engineVersion: barMatch.header.game_version,
            gameVersion: barMatch.game_config.gametype || "Unknown",
            mapSpringName: barMatch.game_config.mapname || "Unknown",
            startTime: new Date(barMatch.header.start_time * 1000),
            gameDurationMs: barMatch.header.game_time * 1000,
            gameEndedNormally: barMatch.statistics.winning_ally_team_ids?.length > 0 ? 1 : 0,
            chatlog: null,
            hasBots: barMatch.game_config.players.find((player) => player.countrycode === "FR") ? 1 : 0,
            preset,
            winningTeamId: barMatch.statistics.winning_ally_team_ids[0] || 0,
            teams: barMatch.game_config.allyteams.map((allyTeam) => ({
                allyTeamId: allyTeam.id,
                playerCount: barMatch.game_config.teams.filter((team) => team.allyteam === allyTeam.id).length,
                startBox: {
                    left: allyTeam.startrectleft || 0,
                    right: allyTeam.startrectright || 0,
                    top: allyTeam.startrecttop || 0,
                    bottom: allyTeam.startrectbottom || 0,
                },
            })),
            contenders: barMatch.game_config.players
                .filter((player) => player.spectator === 0)
                .map((player) => {
                    const team = barMatch.game_config.teams.find((team) => team.id === player.team);
                    // const allyTeam = barMatch.game_config.allyteams.find((ally) => ally.id === team?.allyteam);
                    return {
                        playerId: player.id,
                        teamId: player.team!,
                        allyTeamId: team?.allyteam || 0,
                        faction: team?.side || "unknown",
                        rgbColor: {
                            r: team?.rgbcolor[0] || 0,
                            g: team?.rgbcolor[1] || 0,
                            b: team?.rgbcolor[2] || 0,
                        },
                        handicap: team?.handicap || 0,
                        rank: player.rank,
                        name: player.name,
                        userId: player.accountid,
                        countryCode: player.countrycode,
                        // skill: player.skill,
                        skillUncertainty: player.skilluncertainty,
                        startPos: player.startPos
                            ? {
                                  x: player.startPos[0] || 0,
                                  y: player.startPos[1] || 0,
                                  z: player.startPos[2] || 0,
                              }
                            : undefined,
                    };
                }),
            spectators: barMatch.game_config.players
                .filter((player) => player.spectator === 1)
                .map((player) => ({
                    playerId: player.id,
                    rank: player.rank,
                    name: player.name,
                    userId: player.accountid,
                    countryCode: player.countrycode,
                    // skill: player.skill,
                    skillUncertainty: player.skilluncertainty,
                })),
            script: "",
            battleSettings: {},
            gameSettings: barMatch.game_config.modoptions,
            mapSettings: barMatch.game_config.mapoptions,
            hostSettings: barMatch.game_config.hostoptions,
        };
    }

    if (!parentPort) throw new Error("Parent Port is not defined");
    const narrowedParentPort = parentPort;
    narrowedParentPort.on("message", async (replayFilePath: string) => {
        try {
            const replay = await parseReplay(replayFilePath);
            narrowedParentPort.postMessage({ replayFilePath, replay });
        } catch (error) {
            narrowedParentPort.postMessage({ replayFilePath, undefined, error });
            console.error(error);
        }
    });
}
