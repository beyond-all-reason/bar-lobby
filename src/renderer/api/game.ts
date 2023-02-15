import { computed, Ref, ref } from "@vue/reactivity";
import type { ChildProcess } from "child_process";
import { spawn } from "child_process";
import * as fs from "fs";
import { Signal } from "jaz-ts-utils";
import * as path from "path";

import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Replay } from "@/model/replay";
import { StartScriptConverter } from "@/utils/start-script-converter";
import { isBattle, isReplay } from "@/utils/type-checkers";

export class GameAPI {
    public readonly isGameRunning = computed(() => this.gameProcess.value !== null);
    public onGameLaunched = new Signal();
    public onGameClosed: Signal<number | null> = new Signal();
    public readonly scriptName = "script.txt";

    protected gameProcess: Ref<ChildProcess | null> = ref(null);
    protected scriptConverter = new StartScriptConverter();

    public async launch(battle: AbstractBattle | Replay): Promise<void> {
        await this.fetchMissingContent(battle);

        const engineVersion = isBattle(battle) ? battle.battleOptions.engineVersion : battle.engineVersion;
        const enginePath = path.join(api.info.contentPath, "engine", engineVersion).replaceAll("\\", "/");

        let launchArg = "";
        if (isBattle(battle)) {
            const script = this.battleToStartScript(battle);
            const scriptPath = (launchArg = path.join(api.info.contentPath, this.scriptName));
            await fs.promises.writeFile(scriptPath, script);
        } else {
            launchArg = path.join(api.content.replays.replaysDir, battle.fileName);
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

            api.audio.muteMusic();
        });

        this.gameProcess.value.addListener("close", (exitCode) => {
            this.gameProcess.value = null;
            this.onGameClosed.dispatch(exitCode);

            api.audio.unmuteMusic();

            api.content.replays.queueReplaysToCache();
        });
    }

    public battleToStartScript(battle: AbstractBattle): string {
        return this.scriptConverter.generateScriptStr(battle);
    }

    protected async fetchMissingContent(battle: AbstractBattle | Replay) {
        const engineVersion = isReplay(battle) ? battle.engineVersion : battle.battleOptions.engineVersion;
        const gameVersion = isReplay(battle) ? battle.gameVersion : battle.battleOptions.gameVersion;
        const mapScriptName = isReplay(battle) ? battle.mapScriptName : battle.battleOptions.map;

        const isEngineInstalled = api.content.engine.installedVersions.some((version) => version === engineVersion);
        const isGameInstalled = api.content.game.installedVersions.has(gameVersion);
        const isMapInstalled = api.content.maps.installedMaps.some((map) => map.scriptName === mapScriptName);

        if (!isEngineInstalled || !isGameInstalled || !isMapInstalled) {
            api.notifications.alert({
                text: "Downloading missing content - the game will auto-launch when downloads complete",
            });

            return Promise.all([api.content.engine.downloadEngine(engineVersion), api.content.game.downloadGame(gameVersion), api.content.maps.downloadMaps(mapScriptName)]);
        }

        return;
    }
}
