// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { ChildProcess } from "child_process";
import { spawn } from "child_process";
import { app } from "electron";
import * as fs from "fs";
import * as net from "net";
import { Signal } from "$/jaz-ts-utils/signal";
import * as path from "path";
import * as zlib from "zlib";

import { engineContentAPI } from "@main/content/engine/engine-content";
import { applyDefaultSpringsettings } from "@main/game/springsettings";
import { startScriptConverter } from "@main/utils/start-script-converter";
import { logger } from "@main/utils/logger";
import { gameContentAPI } from "@main/content/game/game-content";
import { WRITE_DATA_PATH, REPLAYS_PATH, BUNDLED_ASSETS_PATH, getAssetsPath, getCaCertPath, getRapidIndexPath, getPackagePath, getPoolPath } from "@main/config/app";
import { BattleWithMetadata } from "@main/game/battle/battle-types";
import { Replay } from "@main/content/replays/replay";
import {
    getNativeEngineDataDirDiagnostics,
    getNativeEngineProcessEnv,
    getNativeEngineProcessEnvDiagnostics,
    MACOS_MINIMAL_FPS_WORKAROUND_DISABLE_ENV,
    MACOS_MINIMAL_FPS_WORKAROUND_ENABLE_ENV,
    MACOS_MINIMAL_FPS_WORKAROUND_REASON,
    MACOS_MINIMAL_FPS_WORKAROUND_ZINK_DEBUG_VALUE,
    MACOS_NATIVE_ENGINE_DATA_DIR_DIAGNOSTIC_PROBE,
    MACOS_NATIVE_ENGINE_ENV_DIAGNOSTIC_PROBE,
    resolveNativeEngineRunner,
    resolvePrDownloaderPath,
    syncMacOSLuaUIOverlayToWritableDataDir,
} from "@main/config/native-engine-runner";
import type { NativeEngineRunner } from "@main/config/native-engine-runner";
import { CHOBBY_MULTIPLAYER_GAME_RAPID_ALIAS, ChobbyMultiplayerProfile, resolveChobbyMultiplayerProfile } from "@main/game/chobby-multiplayer-profile";
import { ChobbyLauncherLoopback, CONNECTION_FILE_NAME } from "@main/game/chobby-launcher-loopback";
import { CHOBBY_LOOPBACK_HELPER_ARG, CHOBBY_LOOPBACK_HELPER_OPTIONS_ENV } from "@main/game/chobby-loopback-helper";

const log = logger("main/game/game.ts");
const engineLogger = logger("[RECOIL ENGINE]", { separator: "\n", level: "info" });

const ENGINE_LOBBY_LOG_MIRROR_LIMIT_BYTES = 256 * 1024;
const ENGINE_LOBBY_LOG_MIRROR_LIMIT_LINES = 1200;

interface EngineLobbyLogMirrorState {
    mirroredBytes: number;
    mirroredLines: number;
    suppressedBytes: number;
    suppressedLines: number;
    suppressedChunks: number;
    limitNoticeLogged: boolean;
}

function createEngineLobbyLogMirrorState(): EngineLobbyLogMirrorState {
    return {
        mirroredBytes: 0,
        mirroredLines: 0,
        suppressedBytes: 0,
        suppressedLines: 0,
        suppressedChunks: 0,
        limitNoticeLogged: false,
    };
}

function countEngineLogLines(text: string) {
    return Math.max(1, text.split(/\r?\n/).filter(Boolean).length);
}

function mirrorEngineOutputToLobbyLog(data: Buffer, level: "info" | "error", state: EngineLobbyLogMirrorState) {
    const text = data.toString();
    const byteLength = Buffer.byteLength(text);
    const lineCount = countEngineLogLines(text);
    const wouldExceedLimit = state.mirroredBytes + byteLength > ENGINE_LOBBY_LOG_MIRROR_LIMIT_BYTES || state.mirroredLines + lineCount > ENGINE_LOBBY_LOG_MIRROR_LIMIT_LINES;

    if (!wouldExceedLimit) {
        engineLogger[level](text);
        state.mirroredBytes += byteLength;
        state.mirroredLines += lineCount;
        return;
    }

    state.suppressedBytes += byteLength;
    state.suppressedLines += lineCount;
    state.suppressedChunks += 1;

    if (!state.limitNoticeLogged) {
        state.limitNoticeLogged = true;
        engineLogger.warn(
            [
                "macOS engine output mirror reached the lobby log limit.",
                `Further engine output is suppressed in lobby log; full engine log remains at ${path.join(WRITE_DATA_PATH, "infolog.txt")}.`,
                `limits bytes=${ENGINE_LOBBY_LOG_MIRROR_LIMIT_BYTES} lines=${ENGINE_LOBBY_LOG_MIRROR_LIMIT_LINES}`,
            ].join(" ")
        );
    }
}

function logEngineOutputSuppressionSummary(state: EngineLobbyLogMirrorState) {
    if (state.suppressedChunks === 0) {
        return;
    }
    log.info(
        `Suppressed ${state.suppressedChunks} engine output chunks from lobby log mirror (${state.suppressedLines} lines, ${state.suppressedBytes} bytes). Full engine log: ${path.join(WRITE_DATA_PATH, "infolog.txt")}`
    );
}

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

export interface ChobbyLaunchSettings {
    engineVersion?: string;
    menu?: string;
}

interface ResolvedChobbyLaunchSettings {
    engineVersion: string;
    menu?: string;
}

interface NativeEngineLaunchSettings {
    engineVersion: string;
    args: string[];
    resolveOnSpawn?: boolean;
    quitLobbyAfterSpawn?: boolean;
    envOverrides?: NodeJS.ProcessEnv;
    includeBundledAssetsInSpringDataDir?: boolean;
    includeBundledEngineSupportInSpringDataDir?: boolean;
    includeBundledMacOSLuaUIOverlayInSpringDataDir?: boolean;
    onExit?: () => void;
}

interface ChobbyLauncherConnectionFile {
    _sl_address?: string;
    _sl_port?: number;
    _sl_write_path?: string;
    _sl_helper_pid?: number;
}

const DEFAULT_CHOBBY_MENU = "rapid://byar-chobby:test";
const DEFAULT_CHOBBY_RAPID_TAG = "byar-chobby:test";
const CHOBBY_CONFIG_FILE_NAME = "chobby_config.json";
const CHOBBY_ENGINE_VERSION_ADDON_PATH = "luamenu/addons/engineversion.lua";
const CHOBBY_RAPID_REPO_HOST = "repos-cdn.beyondallreason.dev";
const CHOBBY_RAPID_REPO_NAME = "byar-chobby";
const CHOBBY_RAPID_TAG_RESOLUTION_ORDER = "repos-cdn.beyondallreason.dev";
const DEFAULT_CHOBBY_CONFIG = {
    server: {
        address: "server4.beyondallreason.info",
        port: 8200,
        protocol: "spring",
        serverName: "BAR",
    },
    game: "byar",
};

export class GameAPI {
    public onGameLaunched = new Signal<void>();
    public onGameClosed: Signal<number | null> = new Signal();
    public readonly startScriptName = "script.txt";

    protected gameProcess: ChildProcess | null = null;
    private chobbyLauncherLoopback: ChobbyLauncherLoopback | null = null;

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

    public async launchReplay(replay: Replay) {
        return this.launch({
            engineVersion: replay.engineVersion,
            gameVersion: replay.gameVersion,
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

    public async launchChobby({ engineVersion, menu = DEFAULT_CHOBBY_MENU }: ChobbyLaunchSettings = {}) {
        const profile = await resolveChobbyMultiplayerProfile(engineVersion);
        log.info(
            `Launching Chobby multiplayer compatibility mode with engine: ${profile.engineVersion}, game: ${profile.gameVersion ?? profile.gameRapidAlias}, profileSource: ${profile.source}, menu: ${menu}`
        );
        await this.assertNativeRuntimeEngineVersionMatches(profile.engineVersion, "Chobby multiplayer");
        await this.ensureChobbyConfigFile();
        await this.ensureChobbySpringSettings();
        await this.ensureChobbyMenuArchive({ engineVersion: profile.engineVersion, menu });
        await this.ensureChobbyMultiplayerGameContent(profile);
        await this.ensureChobbyEngineVersionAlias({ engineVersion: profile.engineVersion, menu });
        if (process.platform === "darwin") {
            await this.prepareDetachedChobbyLauncherLoopback(profile.engineVersion);
        } else {
            await this.prepareChobbyLauncherLoopback(profile.engineVersion);
        }
        return this.launchNativeEngine({
            engineVersion: profile.engineVersion,
            args: ["--write-dir", WRITE_DATA_PATH, "--isolation", "--menu", menu],
            resolveOnSpawn: true,
            quitLobbyAfterSpawn: process.platform === "darwin",
            includeBundledAssetsInSpringDataDir: false,
            includeBundledEngineSupportInSpringDataDir: true,
            includeBundledMacOSLuaUIOverlayInSpringDataDir: true,
            onExit: () => {
                this.stopChobbyLauncherLoopback().catch((err: unknown) => log.warn(`Failed to stop Chobby launcher loopback: ${err instanceof Error ? err.message : String(err)}`));
            },
        });
    }

    private async prepareDetachedChobbyLauncherLoopback(engineVersion: string) {
        const connectionFilePath = path.join(WRITE_DATA_PATH, CONNECTION_FILE_NAME);
        await fs.promises.mkdir(WRITE_DATA_PATH, { recursive: true });
        await fs.promises.rm(connectionFilePath, { force: true });

        const helperOptions = {
            engineVersion,
            assetsPath: getAssetsPath(),
            ...(BUNDLED_ASSETS_PATH && { bundledAssetsPath: BUNDLED_ASSETS_PATH }),
            writeDataPath: WRITE_DATA_PATH,
            platform: process.platform,
        };
        const helperProcess = spawn(process.execPath, this.getChobbyLoopbackHelperArgs(), {
            detached: true,
            stdio: "ignore",
            env: {
                ...process.env,
                [CHOBBY_LOOPBACK_HELPER_OPTIONS_ENV]: JSON.stringify(helperOptions),
            },
        });
        helperProcess.unref();
        log.info(`Spawned detached Chobby loopback helper pid=${helperProcess.pid ?? "<unknown>"}`);

        const connection = await this.waitForChobbyLauncherConnection(connectionFilePath);
        log.info(`Detached Chobby loopback helper ready at ${connection._sl_address}:${connection._sl_port}, pid=${connection._sl_helper_pid ?? helperProcess.pid ?? "<unknown>"}`);
    }

    private getChobbyLoopbackHelperArgs() {
        const electronProcess = process as NodeJS.Process & { defaultApp?: boolean };
        if (electronProcess.defaultApp && process.argv[1]) {
            return [process.argv[1], CHOBBY_LOOPBACK_HELPER_ARG];
        }

        return [CHOBBY_LOOPBACK_HELPER_ARG];
    }

    private async waitForChobbyLauncherConnection(connectionFilePath: string) {
        const timeoutMs = 10_000;
        const startTime = Date.now();
        let lastError = "connection file has not been written";

        while (Date.now() - startTime < timeoutMs) {
            try {
                const connection = JSON.parse(await fs.promises.readFile(connectionFilePath, "utf-8")) as ChobbyLauncherConnectionFile;
                if (connection._sl_address && typeof connection._sl_port === "number" && (await this.canConnectToChobbyLoopback(connection._sl_address, connection._sl_port))) {
                    return connection;
                }
                lastError = `connection file is incomplete: ${connectionFilePath}`;
            } catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        throw new Error(`Timed out waiting for Chobby loopback helper: ${lastError}`);
    }

    private async canConnectToChobbyLoopback(host: string, port: number) {
        return new Promise<boolean>((resolve) => {
            const socket = net.createConnection({ host, port });
            const done = (result: boolean) => {
                socket.destroy();
                resolve(result);
            };
            socket.setTimeout(250, () => done(false));
            socket.once("error", () => done(false));
            socket.once("connect", () => done(true));
        });
    }

    private async prepareChobbyLauncherLoopback(engineVersion: string) {
        await this.stopChobbyLauncherLoopback();
        this.chobbyLauncherLoopback = new ChobbyLauncherLoopback({
            engineVersion,
            assetsPath: getAssetsPath(),
            bundledAssetsPath: BUNDLED_ASSETS_PATH,
            writeDataPath: WRITE_DATA_PATH,
            platform: process.platform,
        });
        const connection = await this.chobbyLauncherLoopback.start();
        log.info(`Prepared Chobby launcher loopback connection file: ${connection.connectionFilePath}`);
    }

    private async stopChobbyLauncherLoopback() {
        const loopback = this.chobbyLauncherLoopback;
        this.chobbyLauncherLoopback = null;
        await loopback?.close();
    }

    private async ensureChobbyConfigFile() {
        const configPath = path.join(WRITE_DATA_PATH, CHOBBY_CONFIG_FILE_NAME);
        await fs.promises.mkdir(WRITE_DATA_PATH, { recursive: true });

        try {
            const existingConfig = JSON.parse(await fs.promises.readFile(configPath, "utf-8"));
            if (existingConfig?.server?.address && existingConfig?.server?.port && existingConfig?.server?.protocol && existingConfig?.game) {
                log.info(`Using existing Chobby config: ${configPath}`);
                return;
            }
        } catch {
            // Missing or malformed config is replaced with the BAR production lobby defaults.
        }

        await fs.promises.writeFile(configPath, `${JSON.stringify(DEFAULT_CHOBBY_CONFIG, null, 2)}\n`, "utf-8");
        log.info(`Wrote Chobby config: ${configPath}`);
    }

    private async ensureChobbyEngineVersionAlias({ engineVersion, menu = DEFAULT_CHOBBY_MENU }: ResolvedChobbyLaunchSettings) {
        if (process.platform !== "darwin") {
            return;
        }

        const rapidTag = menu === DEFAULT_CHOBBY_MENU ? DEFAULT_CHOBBY_RAPID_TAG : menu.replace(/^rapid:\/\//, "");
        const packageMd5 = await this.getChobbyPackageMd5(rapidTag);
        const addonEntry = await this.getSdpEntry(path.join(getPackagePath(), `${packageMd5}.sdp`), CHOBBY_ENGINE_VERSION_ADDON_PATH);
        const addonPath = path.join(getPoolPath(), addonEntry.md5.slice(0, 2), `${addonEntry.md5.slice(2)}.gz`);
        const advertisedEngineVersion = engineVersion;
        const addonText = this.createChobbyEngineVersionAliasAddon(advertisedEngineVersion, addonEntry.filesizeBytes);

        await fs.promises.writeFile(addonPath, zlib.gzipSync(Buffer.from(addonText, "utf-8")));
        log.info(`Patched Chobby engine version alias ${CHOBBY_ENGINE_VERSION_ADDON_PATH} to advertise ${advertisedEngineVersion} for installed engine ${engineVersion}`);
    }

    private async assertNativeRuntimeEngineVersionMatches(engineVersion: string, launchContext = "macOS native engine launch") {
        let runtimeEngineVersion: string;
        try {
            runtimeEngineVersion = await this.getNativeEngineRuntimeVersion(engineVersion);
        } catch (err) {
            throw new Error(
                [
                    `${launchContext} requires native macOS engine ${engineVersion}.`,
                    "Bundle or install the matching macOS engine artifact before launching.",
                    `Details: ${err instanceof Error ? err.message : String(err)}`,
                ].join(" ")
            );
        }

        if (runtimeEngineVersion !== engineVersion) {
            throw new Error(
                [
                    `${launchContext} requires native macOS engine ${engineVersion}, but the installed runtime reports ${runtimeEngineVersion}.`,
                    "Do not alias a newer or older runtime for accepted compatibility; build or install the matching official engine tag.",
                ].join(" ")
            );
        }
    }

    private async getNativeEngineRuntimeVersion(engineVersion: string) {
        const runner = resolveNativeEngineRunner({
            engineVersion,
            assetsPath: getAssetsPath(),
            bundledAssetsPath: BUNDLED_ASSETS_PATH,
            platform: process.platform,
        });
        const versionOutput = await this.readNativeEngineVersion(runner);
        const versionMatch = versionOutput.match(/spring version\s+(\S+)/i);
        if (versionMatch?.[1]) {
            return versionMatch[1];
        }

        throw new Error(`Could not parse native engine runtime version from '${versionOutput.trim()}'`);
    }

    private async readNativeEngineVersion(runner: NativeEngineRunner) {
        return new Promise<string>((resolve, reject) => {
            const versionProcess = spawn(runner.spawnCommand, ["--version"], {
                cwd: runner.enginePath,
                stdio: "pipe",
            });
            const chunks: Buffer[] = [];
            versionProcess.stdout?.on("data", (data: Buffer) => chunks.push(data));
            versionProcess.stderr?.on("data", (data: Buffer) => chunks.push(data));
            versionProcess.on("error", reject);
            versionProcess.on("exit", (code, signal) => {
                const output = Buffer.concat(chunks).toString("utf-8");
                if (code === 0) {
                    resolve(output);
                    return;
                }

                reject(new Error(`Failed to read native engine version, code ${code}, signal ${signal}: ${output.trim()}`));
            });
        });
    }

    private async ensureChobbySpringSettings() {
        const settingsPath = path.join(WRITE_DATA_PATH, "springsettings.cfg");
        await fs.promises.mkdir(WRITE_DATA_PATH, { recursive: true });

        let existingSettings = "";
        try {
            existingSettings = await fs.promises.readFile(settingsPath, "utf-8");
        } catch {
            // The engine will create this file too; we only need it early for Chobby's rapid repo lookup.
        }

        const nextSettings = this.upsertSpringSetting(existingSettings, "RapidTagResolutionOrder", CHOBBY_RAPID_TAG_RESOLUTION_ORDER);
        if (nextSettings !== existingSettings) {
            await fs.promises.writeFile(settingsPath, nextSettings, "utf-8");
            log.info(`Updated Chobby spring settings: ${settingsPath}`);
        }
    }

    private upsertSpringSetting(settings: string, key: string, value: string) {
        const lines = settings.trimEnd() ? settings.trimEnd().split(/\r?\n/) : [];
        let found = false;
        const nextLines = lines.map((line) => {
            const match = line.match(/^(\s*)([^#=]+?)(\s*=\s*)(.*)$/);
            if (!match || match[2].trim() !== key) {
                return line;
            }
            found = true;
            return `${match[1]}${key}${match[3]}${value}`;
        });

        if (!found) {
            nextLines.push(`${key} = ${value}`);
        }

        return `${nextLines.join("\n")}\n`;
    }

    private async getChobbyPackageMd5(rapidTag: string) {
        const versionsPath = path.join(getRapidIndexPath(), CHOBBY_RAPID_REPO_HOST, CHOBBY_RAPID_REPO_NAME, "versions.gz");
        const versions = zlib.gunzipSync(await fs.promises.readFile(versionsPath)).toString("utf-8");
        for (const versionLine of versions.trim().split("\n")) {
            const [alias, packageMd5] = versionLine.split(",");
            if (alias === rapidTag && packageMd5) {
                return packageMd5;
            }
        }
        throw new Error(`Could not resolve Chobby rapid tag: ${rapidTag}`);
    }

    private async getSdpEntry(sdpFilePath: string, targetFileName: string) {
        const sdpFile = zlib.gunzipSync(await fs.promises.readFile(sdpFilePath));
        const normalizedTargetFileName = targetFileName.toLowerCase();
        let offset = 0;
        while (offset < sdpFile.length) {
            const fileNameLength = sdpFile.readUInt8(offset);
            offset += 1;
            const fileName = sdpFile.subarray(offset, offset + fileNameLength).toString("utf-8");
            offset += fileNameLength;
            const md5 = sdpFile.subarray(offset, offset + 16).toString("hex");
            offset += 16;
            offset += 4;
            const filesizeBytes = sdpFile.readUInt32BE(offset);
            offset += 4;

            if (fileName === targetFileName || fileName.toLowerCase() === normalizedTargetFileName) {
                return { fileName, md5, filesizeBytes };
            }
        }
        throw new Error(`Could not find ${targetFileName} in ${sdpFilePath}`);
    }

    private createChobbyEngineVersionAliasAddon(engineVersion: string, filesizeBytes: number) {
        const content = [
            "Spring.Utilities = Spring.Utilities or {}",
            "",
            "function Spring.Utilities.GetEngineVersion()",
            `\treturn "${this.escapeLuaString(engineVersion)}"`,
            "end",
            "",
            "-- macOS BAR lobby engine id compatibility alias.",
            "",
        ].join("\n");
        const contentBytes = Buffer.byteLength(content);
        if (contentBytes > filesizeBytes) {
            throw new Error(`Chobby engine version alias is too large: ${contentBytes} > ${filesizeBytes}`);
        }
        return `${content}${" ".repeat(filesizeBytes - contentBytes)}`;
    }

    private escapeLuaString(value: string) {
        return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    }

    private async ensureChobbyMenuArchive({ engineVersion, menu = DEFAULT_CHOBBY_MENU }: ResolvedChobbyLaunchSettings) {
        const rapidTag = menu === DEFAULT_CHOBBY_MENU ? DEFAULT_CHOBBY_RAPID_TAG : menu.replace(/^rapid:\/\//, "");
        const prBinaryPath = resolvePrDownloaderPath({
            engineVersion,
            assetsPath: getAssetsPath(),
            bundledAssetsPath: BUNDLED_ASSETS_PATH,
            platform: process.platform,
        });
        const caCertPath = getCaCertPath();

        await fs.promises.mkdir(getAssetsPath(), { recursive: true });
        log.info(`Ensuring Chobby menu archive is available: ${rapidTag}`);

        await new Promise<void>((resolve, reject) => {
            let lastProgressLogTime = 0;
            let lastProgressMessage = "";
            const prdProcess = spawn(`${prBinaryPath}`, ["--filesystem-writepath", getAssetsPath(), "--download-game", rapidTag], {
                env: {
                    ...process.env,
                    PRD_RAPID_USE_STREAMER: "false",
                    PRD_RAPID_REPO_MASTER: "https://repos-cdn.beyondallreason.dev/repos.gz",
                    PRD_HTTP_SEARCH_URL: "https://files-cdn.beyondallreason.dev/find",
                    ...(caCertPath && !process.env.PRD_SSL_CERT_FILE && { PRD_SSL_CERT_FILE: caCertPath }),
                },
            });
            prdProcess.stdout?.on("data", (data: Buffer) => {
                for (const line of data
                    .toString()
                    .split(/\r?\n|\r/)
                    .filter(Boolean)) {
                    if (line.startsWith("[Progress]")) {
                        lastProgressMessage = line;
                        const now = Date.now();
                        if (now - lastProgressLogTime >= 5000) {
                            lastProgressLogTime = now;
                            log.info(`[CHOBBY PR-DOWNLOADER] ${line}`);
                        }
                        continue;
                    }
                    log.info(`[CHOBBY PR-DOWNLOADER] ${line}`);
                }
            });
            prdProcess.stderr?.on("data", (data: Buffer) => log.error(`[CHOBBY PR-DOWNLOADER] ${data.toString().trim()}`));
            prdProcess.on("error", reject);
            prdProcess.on("exit", (code, signal) => {
                if (code === 0) {
                    if (lastProgressMessage) {
                        log.info(`[CHOBBY PR-DOWNLOADER] ${lastProgressMessage}`);
                    }
                    resolve();
                    return;
                }

                reject(new Error(`Chobby archive download failed with code ${code}, signal ${signal}`));
            });
        });
    }

    private async ensureChobbyMultiplayerGameContent(profile: ChobbyMultiplayerProfile) {
        const gameTarget = profile.gameRapidAlias || CHOBBY_MULTIPLAYER_GAME_RAPID_ALIAS;
        log.info(`Ensuring Chobby multiplayer game content is available: ${profile.gameVersion ?? gameTarget}`);
        await gameContentAPI.downloadGame(gameTarget);
        log.info("Chobby multiplayer keeps official rapid game content unchanged; macOS graphics fixes must come from the engine/runtime or upstream-compatible content.");
    }

    public async launch({ engineVersion, gameVersion, launchArg }: { engineVersion?: string; gameVersion?: string; launchArg?: string }): Promise<void> {
        if (!engineVersion || !gameVersion || !launchArg) {
            throw new Error("Engine Version, Game Version and launch Arguments need to be specified");
        }

        log.info(`Launching game with engine: ${engineVersion}, game: ${gameVersion}`);
        await this.fetchMissingContent(engineVersion, gameVersion); // TODO preload anything needed through the UI before launching. Remove this step
        return this.launchNativeEngine({
            engineVersion,
            args: ["--write-dir", WRITE_DATA_PATH, "--isolation", launchArg],
        });
    }

    private async launchNativeEngine({
        engineVersion,
        args,
        resolveOnSpawn = false,
        quitLobbyAfterSpawn = false,
        envOverrides,
        includeBundledAssetsInSpringDataDir,
        includeBundledEngineSupportInSpringDataDir,
        includeBundledMacOSLuaUIOverlayInSpringDataDir,
        onExit,
    }: NativeEngineLaunchSettings): Promise<void> {
        if (process.platform === "darwin") {
            await this.assertNativeRuntimeEngineVersionMatches(engineVersion);
        }
        if (process.platform === "darwin" && includeBundledMacOSLuaUIOverlayInSpringDataDir) {
            const syncResult = await syncMacOSLuaUIOverlayToWritableDataDir({
                bundledAssetsPath: BUNDLED_ASSETS_PATH,
                writeDataPath: WRITE_DATA_PATH,
                platform: process.platform,
            });
            if (syncResult.synced) {
                log.info(`Synced macOS LuaUI overlay into writable data dir: ${syncResult.sourcePath} -> ${syncResult.destinationPath}`);
            } else {
                log.debug(`Skipped macOS LuaUI overlay sync: ${syncResult.reason ?? "unknown"}`);
            }
        }
        applyDefaultSpringsettings();

        const runner = resolveNativeEngineRunner({
            engineVersion,
            assetsPath: getAssetsPath(),
            bundledAssetsPath: BUNDLED_ASSETS_PATH,
            platform: process.platform,
        });
        const enginePath = runner.enginePath.replaceAll("\\", "/");
        const engineEnv = getNativeEngineProcessEnv({
            assetsPath: getAssetsPath(),
            bundledAssetsPath: BUNDLED_ASSETS_PATH,
            enginePath,
            includeBundledAssetsInSpringDataDir,
            includeBundledEngineSupportInSpringDataDir,
            includeBundledMacOSLuaUIOverlayInSpringDataDir,
            writeDataPath: WRITE_DATA_PATH,
            platform: process.platform,
            baseEnv: envOverrides ? { ...process.env, ...envOverrides } : process.env,
        });
        log.debug(`Running binary: ${path.join(enginePath, runner.binaryFileName)}, args: ${args}`);
        // macOS-port diagnostic probe: remove or demote after Thread 07 runtime closure accepts the final app-local environment contract.
        if (process.platform === "darwin") {
            log.info(`${MACOS_NATIVE_ENGINE_ENV_DIAGNOSTIC_PROBE}: ${JSON.stringify(getNativeEngineProcessEnvDiagnostics(engineEnv))}`);
            log.info(`${MACOS_NATIVE_ENGINE_DATA_DIR_DIAGNOSTIC_PROBE}: ${JSON.stringify(getNativeEngineDataDirDiagnostics(engineEnv))}`);
            if (engineEnv.ZINK_DEBUG === MACOS_MINIMAL_FPS_WORKAROUND_ZINK_DEBUG_VALUE) {
                const workaroundOptInValue = engineEnv[MACOS_MINIMAL_FPS_WORKAROUND_ENABLE_ENV] ?? "<unset>";
                const workaroundOptOutValue = engineEnv[MACOS_MINIMAL_FPS_WORKAROUND_DISABLE_ENV] ?? "<unset>";
                log.info(
                    [
                        "MACOS_RUNTIME_WORKAROUND",
                        `reason=${MACOS_MINIMAL_FPS_WORKAROUND_REASON}`,
                        `ZINK_DEBUG=${MACOS_MINIMAL_FPS_WORKAROUND_ZINK_DEBUG_VALUE}`,
                        `${MACOS_MINIMAL_FPS_WORKAROUND_ENABLE_ENV}=${workaroundOptInValue}`,
                        `${MACOS_MINIMAL_FPS_WORKAROUND_DISABLE_ENV}=${workaroundOptOutValue}`,
                        "workaround_active=true",
                        "production_acceptance=false",
                        "track_owner=Thread07-runtime-backend",
                    ].join(" ")
                );
            }
        }

        return new Promise<void>((resolve, reject) => {
            try {
                const engineLogMirrorState = createEngineLobbyLogMirrorState();
                let exitHookCalled = false;
                const runExitHook = () => {
                    if (exitHookCalled) {
                        return;
                    }
                    exitHookCalled = true;
                    onExit?.();
                };
                this.gameProcess = spawn(runner.spawnCommand, args, {
                    cwd: enginePath,
                    stdio: quitLobbyAfterSpawn ? "ignore" : "pipe",
                    detached: true,
                    env: engineEnv,
                });
                if (quitLobbyAfterSpawn) {
                    this.gameProcess.addListener("error", (err) => {
                        log.error(err);
                        runExitHook();
                        reject(err);
                    });
                    this.gameProcess.addListener("spawn", () => {
                        log.info("Chobby spawned; exiting BAR lobby process by policy.");
                        if (process.platform === "darwin") {
                            app.dock?.hide();
                            app.hide();
                        }
                        this.gameProcess?.unref();
                        this.onGameLaunched.dispatch();
                        resolve();
                        this.gameProcess = null;
                        setImmediate(() => app.exit(0));
                    });
                    log.debug(`Game process PID: ${this.gameProcess.pid}`);
                    return;
                }
                if (!this.gameProcess.stdout || !this.gameProcess.stderr) throw new Error("failed to access game process stream");
                let isGameRunning = false;
                this.gameProcess.stdout.on("data", (data) => {
                    mirrorEngineOutputToLobbyLog(data, "info", engineLogMirrorState);
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
                        this.gameProcess = null;
                        isGameRunning = false;
                        this.onGameClosed.dispatch(null);
                    }
                });
                this.gameProcess.stderr.on("data", (data) => {
                    mirrorEngineOutputToLobbyLog(data, "error", engineLogMirrorState);
                });
                this.gameProcess.addListener("error", (err) => {
                    log.error(err);
                    runExitHook();
                });
                this.gameProcess.addListener("exit", (code) => {
                    runExitHook();
                    if (code !== 0) {
                        log.error(`Game process exited with code: ${code}`);
                        reject(new Error(`Game process exited with code: ${code}`));
                    } else {
                        log.info(`Game process exited with code: ${code}`);
                    }
                    this.gameProcess = null;
                    if (isGameRunning) this.onGameClosed.dispatch(code); // Dispatch if the game closed unexpectedly
                });
                this.gameProcess.addListener("spawn", () => {
                    log.debug(`Game process spawned successfully`);
                    if (resolveOnSpawn) {
                        isGameRunning = true;
                        this.onGameLaunched.dispatch();
                        resolve();
                    }
                });
                this.gameProcess.addListener("close", (exitCode) => {
                    logEngineOutputSuppressionSummary(engineLogMirrorState);
                    log.debug(`Game process closed with exit code: ${exitCode}`);
                });
                log.debug(`Game process PID: ${this.gameProcess.pid}`);
            } catch (err) {
                log.error(`Failed to launch game: ${err}`);
                reject(err);
            }
        });
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
