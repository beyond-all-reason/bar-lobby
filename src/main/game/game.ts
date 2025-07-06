// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { ChildProcess } from "child_process";
import { spawn } from "child_process";
import * as fs from "fs";
import { Signal } from "$/jaz-ts-utils/signal";
import * as path from "path";

import { engineContentAPI } from "@main/content/engine/engine-content";

import { startScriptConverter } from "@main/utils/start-script-converter";
import { logger } from "@main/utils/logger";
import { gameContentAPI } from "@main/content/game/game-content";
import { WRITE_DATA_PATH, REPLAYS_PATH, ENGINE_PATH, ASSETS_PATH } from "@main/config/app";
import { BattleWithMetadata } from "@main/game/battle/battle-types";
import { LaunchReplay } from "@main/content/game/type";

const log = logger("main/game/game.ts");
const engineLogger = logger("[RECOIL ENGINE]", { separator: "\n", level: "info" });

export interface ScriptLaunchSettings {
    engineVersion: string;
    gameVersion: string;
    script: string;
}

export interface MultiplayerLaunchSettings {
    engineVersion: string;
    gameVersion: string;
    springString: string;
}

export class GameAPI {
    public onGameLaunched = new Signal<void>();
    public onGameClosed: Signal<number | null> = new Signal();
    public readonly startScriptName = "script.txt";

    protected gameProcess: ChildProcess | null = null;

    public async launchBattle(battle: BattleWithMetadata): Promise<void> {
        const script = startScriptConverter.generateScriptStr(battle);
        const scriptPath = path.join(WRITE_DATA_PATH, this.startScriptName);
        await fs.promises.writeFile(scriptPath, script);
        await this.launch({
            engineVersion: battle.battleOptions.engineVersion,
            gameVersion: battle.battleOptions.gameVersion,
            launchArg: scriptPath,
        });
    }

    public launchReplay: LaunchReplay = async (replay) => {
        if (replay) {
            await this.launch({
                engineVersion: replay.engineVersion,
                gameVersion: replay.gameVersion,
                launchArg: replay.filePath ? replay.filePath : path.join(REPLAYS_PATH, replay.fileName),
            });
        }
    };

    public async launchScript({ engineVersion, gameVersion, script }: ScriptLaunchSettings) {
        log.debug(`Launching game with script: ${script}`);
        const scriptGameVersion = script.match(/gametype\s*=\s*(.*);/)?.[1];
        const mapSpringName = script.match(/mapname\s*=\s*(.*);/)?.[1];
        if (!mapSpringName) {
            throw new Error("Could not parse map name from script");
        }
        const scriptPath = path.join(WRITE_DATA_PATH, this.startScriptName);
        await fs.promises.writeFile(scriptPath, script);
        await this.launch({
            engineVersion,
            gameVersion: scriptGameVersion || gameVersion, // using script's game version if available
            launchArg: scriptPath,
        });
    }

    public async launchMultiplayer({ engineVersion, gameVersion, springString }: MultiplayerLaunchSettings) {
        return this.launch({
            engineVersion,
            gameVersion,
            launchArg: springString,
        });
    }

    public async launch({ engineVersion, gameVersion, launchArg }: { engineVersion?: string; gameVersion?: string; launchArg?: string }): Promise<void> {
        if (!engineVersion || !gameVersion || !launchArg) {
            throw new Error("Engine Version, Game Version and launch Arguments need to be specified");
        }

        try {
            log.info(`Launching game with engine: ${engineVersion}, game: ${gameVersion}`);
            await this.fetchMissingContent(engineVersion, gameVersion); // TODO preload anything needed through the UI before launching. Remove this step
            const enginePath = path.join(ENGINE_PATH, engineVersion).replaceAll("\\", "/");
            const args = ["--write-dir", WRITE_DATA_PATH, "--isolation", launchArg];
            const binaryName = process.platform === "win32" ? "spring.exe" : "./spring";
            log.debug(`Running binary: ${path.join(enginePath, binaryName)}, args: ${args}`);

            return new Promise<void>((resolve, reject) => {
                try {
                    this.gameProcess = spawn(binaryName, args, {
                        cwd: enginePath,
                        stdio: "pipe",
                        detached: true,
                        env: {
                            ...process.env,
                            SPRING_DATADIR: ASSETS_PATH, // Engine will read from both the assets and write dir
                        },
                    });
                    if (!this.gameProcess.stdout || !this.gameProcess.stderr) throw new Error("failed to access game process stream");
                    let isGameLoading = false;
                    this.gameProcess.stdout.on("data", (data) => {
                        engineLogger.info(`${data}`);
                        if (!isGameLoading && data.toString().includes("[Game::Load]")) {
                            isGameLoading = true;
                            this.onGameLaunched.dispatch();
                            resolve();
                        }
                    });
                    this.gameProcess.stderr.on("data", (data) => {
                        engineLogger.error(`${data}`);
                    });
                    this.gameProcess.addListener("error", (err) => {
                        log.error(err);
                    });
                    this.gameProcess.addListener("exit", (code) => {
                        if (code !== 0) {
                            log.error(`Game process exited with code: ${code}`);
                            reject(new Error(`Game process exited with code: ${code}`));
                        } else {
                            log.info(`Game process exited with code: ${code}`);
                        }
                    });
                    this.gameProcess.addListener("spawn", () => {
                        log.debug(`Game process spawned successfully`);
                    });
                    this.gameProcess.addListener("close", (exitCode) => {
                        this.gameProcess = null;
                        this.onGameClosed.dispatch(exitCode);
                    });
                    log.debug(`Game process PID: ${this.gameProcess.pid}`);
                } catch (err) {
                    log.error(`Failed to launch game: ${err}`);
                    reject(err);
                }
            });
        } catch (err) {
            log.error(err);
        }
    }

    public isGameRunning() {
        return this.gameProcess !== null;
    }

    //TODO not handling maps, not sure if needed if we always come from the lobby's UI
    protected async fetchMissingContent(engineVersion?: string, gameVersion?: string) {
        if (!engineVersion || !gameVersion) {
            throw new Error("Engine Version and Game Version need to be specified");
        }

        const isEngineInstalled = engineContentAPI.isVersionInstalled(engineVersion);
        const isGameInstalled = gameContentAPI.isVersionInstalled(gameVersion);
        if (!isEngineInstalled || !isGameInstalled) {
            //|| !isMapInstalled) {
            //TODO replace with an event
            // api.notifications.alert({
            //     text: "Downloading missing content - the game will auto-launch when downloads complete",
            // });
            return Promise.all([engineContentAPI.downloadEngine(engineVersion), gameContentAPI.downloadGame(gameVersion)]);
        }
        return;
    }
}

export const gameAPI = new GameAPI();
