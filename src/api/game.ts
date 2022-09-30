import { computed, Ref, ref } from "@vue/reactivity";
import type { ChildProcess } from "child_process";
import { spawn } from "child_process";
import * as fs from "fs";
import { Signal } from "jaz-ts-utils";
import * as path from "path";

import { AbstractBattle } from "@/model/battle/abstract-battle";
import { SelectableReplayData } from "@/model/replay";
import { StartScriptConverter } from "@/utils/start-script-converter";

export class GameAPI {
    public readonly isGameRunning = computed(() => this.gameProcess.value !== null);
    public onGameLaunched = new Signal();
    public onGameClosed: Signal<number | null> = new Signal();

    protected gameProcess: Ref<ChildProcess | null> = ref(null);
    protected scriptConverter = new StartScriptConverter();

    public async launch(options: { battle: AbstractBattle } | { replay: SelectableReplayData }): Promise<void> {
        const engineVersion = "battle" in options ? options.battle?.battleOptions.engineVersion : options.replay.engineVersion;
        const enginePath = path.join(api.info.contentPath, "engine", engineVersion).replaceAll("\\", "/");

        let launchArg = "";
        if ("battle" in options) {
            const script = this.battleToStartScript(options.battle);
            const scriptPath = (launchArg = path.join(api.info.contentPath, "script.txt"));
            await fs.promises.writeFile(scriptPath, script);
        } else {
            launchArg = path.join(api.content.replays.replaysDir, options.replay.fileName);
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
}
