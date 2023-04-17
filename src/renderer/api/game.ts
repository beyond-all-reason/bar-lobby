import { computed, Ref, ref } from "@vue/reactivity";
import type { ChildProcess } from "child_process";
import { spawn } from "child_process";
import * as fs from "fs";
import { Signal } from "jaz-ts-utils";
import * as path from "path";

import { defaultEngineVersion } from "@/config/default-versions";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Replay } from "@/model/cache/replay";
import { StartScriptConverter } from "@/utils/start-script-converter";
import { isReplay } from "@/utils/type-checkers";

export class GameAPI {
    public readonly isGameRunning = computed(() => this.gameProcess.value !== null);
    public onGameLaunched = new Signal();
    public onGameClosed: Signal<number | null> = new Signal();
    public readonly scriptName = "script.txt";

    protected gameProcess: Ref<ChildProcess | null> = ref(null);
    protected scriptConverter = new StartScriptConverter();

    public async launch(battle: AbstractBattle): Promise<void>;
    public async launch(replay: Replay): Promise<void>;
    public async launch(script: string): Promise<void>;
    public async launch(arg: AbstractBattle | Replay | string): Promise<void> {
        let engineVersion: string;
        let gameVersion: string;
        let mapName: string;
        let script: string | undefined;

        if (arg instanceof AbstractBattle) {
            engineVersion = arg.battleOptions.engineVersion;
            gameVersion = arg.battleOptions.gameVersion;
            mapName = arg.battleOptions.map;
            script = this.scriptConverter.generateScriptStr(arg);
        } else if (typeof arg === "string") {
            engineVersion = defaultEngineVersion;
            gameVersion = arg.match(/gametype\s*=\s*(.*);/)?.[1]!;
            mapName = arg.match(/mapname\s*=\s*(.*);/)?.[1]!;
            if (!gameVersion) {
                throw new Error("Could not parse game version from script");
            }
            if (!mapName) {
                throw new Error("Could not map name from script");
            }
            script = arg;
        } else {
            engineVersion = arg.engineVersion;
            gameVersion = arg.gameVersion;
            mapName = arg.mapScriptName;
        }

        await this.fetchMissingContent(engineVersion, gameVersion, mapName);

        const enginePath = path.join(api.info.contentPath, "engine", engineVersion).replaceAll("\\", "/");

        let launchArg = "";
        if (script) {
            const scriptPath = (launchArg = path.join(api.info.contentPath, this.scriptName));
            await fs.promises.writeFile(scriptPath, script);
        } else if (isReplay(arg)) {
            launchArg = path.join(api.content.replays.replaysDir, arg.fileName);
        }

        const args = ["--write-dir", api.info.contentPath, "--isolation", launchArg];

        const binaryName = process.platform === "win32" ? "spring.exe" : "./spring";
        this.gameProcess.value = spawn(binaryName, args, {
            cwd: enginePath,
            stdio: "ignore",
            detached: true,
        });

        this.gameProcess.value.addListener("spawn", () => {
            this.onGameLaunched.dispatch();

            this.updateLastLaunched(engineVersion, gameVersion, mapName);

            api.audio.muteMusic();
        });

        this.gameProcess.value.addListener("close", (exitCode) => {
            this.gameProcess.value = null;
            this.onGameClosed.dispatch(exitCode);

            api.audio.unmuteMusic();

            api.content.replays.queueReplaysToCache();
        });
    }

    protected async fetchMissingContent(engineVersion: string, gameVersion: string, mapScriptName: string) {
        const isEngineInstalled = api.content.engine.isVersionInstalled(engineVersion);
        const isGameInstalled = api.content.game.isVersionInstalled(gameVersion);
        const isMapInstalled = api.content.maps.isVersionInstalled(mapScriptName);

        if (!isEngineInstalled || !isGameInstalled || !isMapInstalled) {
            api.notifications.alert({
                text: "Downloading missing content - the game will auto-launch when downloads complete",
            });

            return Promise.all([api.content.engine.downloadEngine(engineVersion), api.content.game.downloadGame(gameVersion), api.content.maps.downloadMaps(mapScriptName)]);
        }

        return;
    }

    protected async updateLastLaunched(engineVersion: string, gameVersion: string, mapScriptName: string) {
        try {
            await api.cacheDb
                .updateTable("engineVersion")
                .set({
                    lastLaunched: new Date(),
                })
                .where("id", "=", engineVersion)
                .execute();
        } catch (err) {
            console.error(`Error updating lastLaunched field for engine: ${engineVersion}`, err);
        }

        try {
            await api.cacheDb
                .updateTable("gameVersion")
                .set({
                    lastLaunched: new Date(),
                })
                .where("id", "=", gameVersion)
                .execute();
        } catch (err) {
            console.error(`Error updating lastLaunched field for game: ${gameVersion}`, err);
        }

        try {
            await api.cacheDb
                .updateTable("map")
                .set({
                    lastLaunched: new Date(),
                })
                .where("scriptName", "=", mapScriptName)
                .execute();
        } catch (err) {
            console.error(`Error updating lastLaunched field for map: ${mapScriptName}`, err);
        }
    }
}
