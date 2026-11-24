// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { ChildProcess } from "child_process";
import { spawn } from "child_process";
import * as fs from "fs";
import { Signal } from "$/jaz-ts-utils/signal";
import * as path from "path";

import { contentAPI } from "@main/content/content-api";
import type { ContentRef } from "@main/content/content-ref";
import { engineConfig, type EngineSession } from "@main/game/engine-config/engine-config";
import { startScriptConverter } from "@main/utils/start-script-converter";
import { logger } from "@main/utils/logger";
import { WRITE_DATA_PATH, REPLAYS_PATH, ENGINE_DEFAULTS_PATH, getEnginePath, getAssetsPath } from "@main/config/app";
import { BattleWithMetadata } from "@main/game/battle/battle-types";
import { Replay } from "@main/replays/replay";

const log = logger("main/game/game.ts");
const CLOSING_PROCESS_GRACE_MS = 15_000;
// After each signal, how long a process stopped by the client has to close.
const STOP_GRACE_MS = 5_000;
const engineLogger = logger("[RECOIL ENGINE]", { separator: "\n", level: "info" });

export interface ScriptLaunchSettings {
    engineVersion: string;
    gameVersion: string;
    script: string;
}

export interface MissionLaunchSettings {
    engineVersion: string;
    // The base game under the mission's archive, which the start script names as its gametype.
    gameVersion: string;
    // Left out when the mission ships its map, which isn't content to check or fetch.
    mapSpringName?: string;
    script: string;
    // Read by the engine after the assets: the mission archive's folder and the folders with the maps it ships.
    dataDirs: string[];
    // Called once the process has closed, by which time the engine has finished writing any save made in the game.
    onProcessClosed?: () => void;
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
    // A process that has asked to close but not yet closed, which can take seconds; see RecoilEngine#2450.
    protected closingProcess: { process: ChildProcess; closed: Promise<void>; session: EngineSession } | null = null;
    // From the start of a launch until its process is spawned, so a second launch is refused rather than queued.
    protected preparingLaunch = false;

    public async launchBattle(battle: BattleWithMetadata): Promise<void> {
        const script = await startScriptConverter.generateScriptStr(battle);
        const scriptPath = path.join(WRITE_DATA_PATH, this.startScriptName);
        await fs.promises.writeFile(scriptPath, script);
        await this.launch({
            engineVersion: battle.battleOptions.engineVersion,
            gameVersion: battle.battleOptions.gameVersion,
            mapSpringName: battle.battleOptions.map?.springName,
            launchArg: scriptPath,
        });
    }

    public async launchReplay(replay: Replay) {
        return this.launch({
            engineVersion: replay.engineVersion,
            gameVersion: replay.gameVersion,
            mapSpringName: replay.mapSpringName,
            launchArg: replay.filePath ? replay.filePath : path.join(REPLAYS_PATH, replay.fileName),
        });
    }

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
            mapSpringName,
            launchArg: scriptPath,
        });
    }

    public async launchMission({ engineVersion, gameVersion, mapSpringName, script, dataDirs, onProcessClosed }: MissionLaunchSettings) {
        const scriptPath = path.join(WRITE_DATA_PATH, this.startScriptName);
        await fs.promises.writeFile(scriptPath, script);
        await this.launch({ engineVersion, gameVersion, mapSpringName, launchArg: scriptPath, dataDirs, onProcessClosed });
    }

    public async launchMultiplayer({ engineVersion, gameVersion, springString }: MultiplayerLaunchSettings) {
        return this.launch({
            engineVersion,
            gameVersion,
            launchArg: springString,
        });
    }

    public async launch({
        engineVersion,
        gameVersion,
        mapSpringName,
        launchArg,
        dataDirs = [],
        onProcessClosed,
    }: {
        engineVersion?: string;
        gameVersion?: string;
        mapSpringName?: string;
        launchArg?: string;
        dataDirs?: string[];
        onProcessClosed?: () => void;
    }): Promise<void> {
        if (!engineVersion || !gameVersion || !launchArg) {
            throw new Error("Engine Version, Game Version and launch Arguments need to be specified");
        }

        // A second launch would otherwise wait for the whole match to end before starting.
        if (this.gameProcess || this.preparingLaunch) {
            throw new Error("A game is already running");
        }

        log.info(`Launching game with engine: ${engineVersion}, game: ${gameVersion}`);

        let session: EngineSession;
        this.preparingLaunch = true;
        try {
            // Playing something is the clearest sign it is still wanted, and it is the one thing every
            // launch path has in common.
            const content: ContentRef[] = [{ type: "engine", id: engineVersion }, { type: "game", id: gameVersion }, ...(mapSpringName ? [{ type: "map" as const, id: mapSpringName }] : [])];
            void contentAPI.markUsed(content);
            // Also the last word on whether everything is there: content that cannot be acquired is refused here.
            await this.fetchMissingContent(content);

            await this.waitForClosingProcess();
            session = await engineConfig.beginSession(engineVersion);
        } finally {
            // Nothing is awaited from here to the spawn, so no launch can slip in between.
            this.preparingLaunch = false;
        }
        const enginePath = path.join(getEnginePath(), engineVersion).replaceAll("\\", "/");
        const args = ["--write-dir", WRITE_DATA_PATH, "--isolation", launchArg];
        // A full path, never a bare name: Windows only finds a bare name in cwd by searching the current
        // directory, which NoDefaultCurrentDirectoryInExePath turns off, and then falls back to PATH.
        const binaryPath = path.join(enginePath, process.platform === "win32" ? "spring.exe" : "spring");
        log.debug(`Running binary: ${binaryPath}, args: ${args}`);

        return new Promise<void>((resolve, reject) => {
            try {
                this.gameProcess = spawn(binaryPath, args, {
                    cwd: enginePath,
                    stdio: "pipe",
                    detached: true,
                    env: {
                        ...process.env,
                        // Beneath the write dir and the engine's own dir, the engine reads the client's default
                        // settings, then the assets, then these.
                        SPRING_DATADIR: [ENGINE_DEFAULTS_PATH, getAssetsPath(), ...dataDirs].join(path.delimiter),
                    },
                });
                const gameProcess = this.gameProcess;
                const closed = new Promise<void>((resolveClosed) => gameProcess.once("close", () => resolveClosed()));
                if (gameProcess.pid !== undefined) session.started(gameProcess.pid);
                if (!this.gameProcess.stdout || !this.gameProcess.stderr) throw new Error("failed to access game process stream");
                let isGameRunning = false;
                this.gameProcess.stdout.on("data", (data) => {
                    engineLogger.info(`${data}`);
                    // Check if the game has started
                    // This is a heuristic based on the log output, as the engine does not provide a specific event for game launch
                    //TODO replace this with some ipc event from the engine when it is available
                    if (!isGameRunning && data.toString().includes("[Game::Load]")) {
                        isGameRunning = true;
                        this.onGameLaunched.dispatch();
                        resolve();
                    }
                    //TODO this is a workaround for the fact that the engine does not exit right away when the game is closed (can take a few seconds on Linux)
                    // See https://github.com/beyond-all-reason/RecoilEngine/issues/2450
                    if (isGameRunning && data.toString().includes("[SpringApp::Kill][8]")) {
                        log.info("Game process requested to close");
                        this.closingProcess = { process: gameProcess, closed, session };
                        this.gameProcess = null;
                        isGameRunning = false;
                        this.onGameClosed.dispatch(null);
                    }
                });
                this.gameProcess.stderr.on("data", (data) => {
                    engineLogger.error(`${data}`);
                });
                this.gameProcess.addListener("error", (err) => {
                    log.error(err);
                    void session.end();
                });
                this.gameProcess.addListener("exit", (code) => {
                    // Cleared before onGameClosed, whose listeners check isGameRunning. Without this, an engine
                    // that crashed or failed to load still counted as running, so new replays were queued
                    // until the next game closed normally.
                    if (this.gameProcess === gameProcess) this.gameProcess = null;
                    if (code !== 0) {
                        log.error(`Game process exited with code: ${code}`);
                        reject(new Error(`Game process exited with code: ${code}`));
                    } else {
                        log.info(`Game process exited with code: ${code}`);
                    }
                    if (isGameRunning) this.onGameClosed.dispatch(code); // Dispatch if the game closed unexpectedly
                });
                this.gameProcess.addListener("spawn", () => {
                    log.debug(`Game process spawned successfully`);
                });
                // Not on exit: the engine may still be writing its settings until its streams close.
                this.gameProcess.addListener("close", (exitCode) => {
                    log.debug(`Game process closed with exit code: ${exitCode}`);
                    if (this.closingProcess?.process === gameProcess) this.closingProcess = null;
                    void session.end();
                    onProcessClosed?.();
                });
                log.debug(`Game process PID: ${this.gameProcess.pid}`);
            } catch (err) {
                log.error(`Failed to launch game: ${err}`);
                void session.end();
                reject(err);
            }
        });
    }

    /**
     * A launch can start while the previous game is still closing. It gets a moment to finish, since it may
     * still be writing its settings, and is then stopped: it has already asked to close. SIGTERM can't stop the
     * hang this works around, so SIGKILL follows. If even that doesn't close it, its session is ended here, or
     * every later launch would wait for it.
     */
    protected async waitForClosingProcess() {
        const closing = this.closingProcess;
        if (!closing) return;
        const closedWithin = async (ms: number) => {
            let timer: ReturnType<typeof setTimeout> | undefined;
            const closed = await Promise.race([closing.closed.then(() => true), new Promise<boolean>((resolve) => (timer = setTimeout(() => resolve(false), ms)))]);
            clearTimeout(timer);

            return closed;
        };
        if (await closedWithin(CLOSING_PROCESS_GRACE_MS)) return;
        log.warn(`The previous game process (pid ${closing.process.pid}) asked to close but hasn't after ${CLOSING_PROCESS_GRACE_MS / 1000} s; stopping it`);
        closing.process.kill();
        if (await closedWithin(STOP_GRACE_MS)) return;
        log.warn(`The previous game process (pid ${closing.process.pid}) is still running; killing it`);
        closing.process.kill("SIGKILL");
        if (await closedWithin(STOP_GRACE_MS)) return;
        log.error(`The previous game process (pid ${closing.process.pid}) still hasn't closed; launching anyway`);
        if (this.closingProcess === closing) this.closingProcess = null;
        await closing.session.end();
    }

    public isGameRunning() {
        return this.gameProcess !== null;
    }

    protected async fetchMissingContent(content: ContentRef[]) {
        await contentAPI.ensure(content);
    }
}

export const gameAPI = new GameAPI();
