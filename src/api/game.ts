import type { ChildProcess } from "child_process";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

import { AbstractBattle } from "@/model/battle/abstract-battle";
import type { EngineVersionFormat } from "@/model/formats";
import { StartScriptConverter } from "@/utils/start-script-converter";

export class GameAPI {
    public gameProcess?: ChildProcess;

    protected scriptConverter = new StartScriptConverter();

    constructor(protected userDataDir: string, protected dataDir: string) {}

    public async launch(battle: AbstractBattle): Promise<void>;
    public async launch(startScript: string, engine: EngineVersionFormat): Promise<void>;
    public async launch(battleOrStartScript: AbstractBattle | string, engine?: EngineVersionFormat): Promise<void> {
        const engineVersion = typeof battleOrStartScript === "string" ? engine! : battleOrStartScript.battleOptions.engineVersion;
        const enginePath = path.join(this.dataDir, "engine", engineVersion).replaceAll("\\", "/");
        const scriptPath = path.join(this.dataDir, "barlobby_script.txt");

        let scriptStr = "";
        if (typeof battleOrStartScript === "object") {
            scriptStr = this.scriptConverter.generateScriptStr(battleOrStartScript);
        } else {
            scriptStr = battleOrStartScript;
        }

        await fs.promises.writeFile(scriptPath, scriptStr);

        const args = ["--write-dir", this.dataDir, "--isolation", scriptPath];

        this.gameProcess = spawn("spring.exe", args, {
            cwd: enginePath,
            stdio: "ignore",
            detached: true,
        });
    }
}
