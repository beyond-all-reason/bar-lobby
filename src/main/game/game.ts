import type { ChildProcess } from "child_process";
import { spawn } from "child_process";
import * as fs from "fs";
import { Signal } from "$/jaz-ts-utils/signal";
import * as path from "path";

import { engineContentAPI } from "@main/content/engine/engine-content";

import { Replay } from "@main/content/replays/replay";
import { startScriptConverter } from "@main/utils/start-script-converter";
import { DEFAULT_ENGINE_VERSION } from "@main/config/default-versions";
import { logger } from "@main/utils/logger";
import { gameContentAPI } from "@main/content/game/game-content";
import { CONTENT_PATH, REPLAYS_PATH } from "@main/config/app";
import { BattleWithMetadata } from "@main/game/battle/battle-types";

const log = logger("main/game/game.ts");
const engineLogger = logger("[RECOIL ENGINE]", { separator: "\n", level: "info" });

export class GameAPI {
    public onGameLaunched = new Signal();
    public onGameClosed: Signal<number | null> = new Signal();
    public readonly scriptName = "script.txt";

    protected gameProcess: ChildProcess | null = null;

    public async launchBattle(battle: BattleWithMetadata): Promise<void> {
        const script = startScriptConverter.generateScriptStr(battle);
        const scriptPath = path.join(CONTENT_PATH, this.scriptName);
        await fs.promises.writeFile(scriptPath, script);
        await this.launch({
            engineVersion: battle.battleOptions.engineVersion,
            gameVersion: battle.battleOptions.gameVersion,
            mapScriptName: battle.battleOptions.mapScriptName,
            launchArg: scriptPath,
        });
    }

    public async launchReplay(replay: Replay): Promise<void> {
        await this.launch({
            engineVersion: replay.engineVersion,
            gameVersion: replay.gameVersion,
            mapScriptName: replay.mapScriptName,
            launchArg: replay.filePath ? replay.filePath : path.join(REPLAYS_PATH, replay.fileName),
        });
    }

    public async launchScript(script: string): Promise<void> {
        log.debug(`Launching game with script: ${script}`);
        const gameVersion = script.match(/gametype\s*=\s*(.*);/)?.[1]!;
        if (!gameVersion) {
            throw new Error("Could not parse game version from script");
        }
        const mapScriptName = script.match(/mapname\s*=\s*(.*);/)?.[1]!;
        if (!mapScriptName) {
            throw new Error("Could not parse map name from script");
        }
        const scriptPath = path.join(CONTENT_PATH, this.scriptName);
        await fs.promises.writeFile(scriptPath, script);
        await this.launch({
            engineVersion: DEFAULT_ENGINE_VERSION,
            gameVersion,
            mapScriptName,
            launchArg: scriptPath,
        });
    }

    public async launch({
        engineVersion = DEFAULT_ENGINE_VERSION,
        gameVersion,
        mapScriptName,
        launchArg,
    }: {
        engineVersion: string;
        gameVersion: string;
        mapScriptName: string;
        launchArg: string;
    }): Promise<void> {
        try {
            log.info(`Launching game with engine: ${engineVersion}, game: ${gameVersion}, map: ${mapScriptName}`);
            await this.fetchMissingContent(engineVersion, gameVersion, mapScriptName);
            const enginePath = path.join(CONTENT_PATH, "engine", engineVersion).replaceAll("\\", "/");
            const args = ["--write-dir", CONTENT_PATH, "--isolation", launchArg];
            const binaryName = process.platform === "win32" ? "spring.exe" : "./spring";
            log.debug(`Running binary: ${path.join(enginePath, binaryName)}, args: ${args}`);

            this.gameProcess = spawn(binaryName, args, {
                cwd: enginePath,
                stdio: "pipe",
                detached: true,
            });

            this.gameProcess.stdout.on("data", (data) => {
                engineLogger.debug(`${data}`);
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
                } else {
                    log.debug(`Game process exited with code: ${code}`);
                }
            });

            this.gameProcess.addListener("spawn", () => {
                this.onGameLaunched.dispatch();
                // this.updateLastLaunched(engineVersion, gameVersion, mapName);
            });

            this.gameProcess.addListener("close", (exitCode) => {
                this.gameProcess = null;
                this.onGameClosed.dispatch(exitCode);
            });
            log.debug(`Game process PID: ${this.gameProcess.pid}`);
        } catch (err) {
            log.error(err);
        }
    }

    public isGameRunning() {
        return this.gameProcess !== null;
    }

    //TODO not handling maps, not sure if needed if we always come from the lobby's UI
    protected async fetchMissingContent(engineVersion: string, gameVersion: string, mapScriptName: string) {
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
