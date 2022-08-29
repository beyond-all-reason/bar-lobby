import type { ChildProcess } from "child_process";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

import { AbstractBattle } from "@/model/battle/abstract-battle";
import { StartScriptConverter } from "@/utils/start-script-converter";

export class GameAPI {
    public gameProcess?: ChildProcess;

    protected scriptConverter = new StartScriptConverter();

    public async launch(battle: AbstractBattle): Promise<void>;
    public async launch(startScript: string, engine: string): Promise<void>;
    public async launch(battleOrStartScript: AbstractBattle | string, engine?: string): Promise<void> {
        const engineVersion = typeof battleOrStartScript === "string" ? engine! : battleOrStartScript.battleOptions.engineVersion;
        const enginePath = path.join(api.info.contentPath, "engine", engineVersion).replaceAll("\\", "/");
        const scriptPath = path.join(api.info.contentPath, "barlobby_script.txt");

        let scriptStr = "";
        if (typeof battleOrStartScript === "object") {
            scriptStr = this.battleToStartScript(battleOrStartScript);
        } else {
            scriptStr = battleOrStartScript;
        }

        await fs.promises.writeFile(scriptPath, scriptStr);

        const args = ["--write-dir", api.info.contentPath, "--isolation", scriptPath];

        const binaryName = process.platform === "win32" ? "spring.exe" : "./spring";
        this.gameProcess = spawn(binaryName, args, {
            cwd: enginePath,
            stdio: "ignore",
            detached: true,
        });
    }

    public battleToStartScript(battle: AbstractBattle): string {
        return this.scriptConverter.generateScriptStr(battle);
    }
}
