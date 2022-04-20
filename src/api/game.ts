import * as fs from "fs";
import * as path from "path";
import { spawn} from "child_process";
import type { ChildProcess } from "child_process";
import type { EngineVersionFormat } from "@/model/formats";
import { StartScriptConverter } from "@/utils/start-script-converter";
import { Battle } from "@/model/battle/battle";

export class GameAPI {
    public gameProcess?: ChildProcess;

    protected scriptConverter = new StartScriptConverter();

    constructor(protected userDataDir: string, protected dataDir: string) {
    }

    public async launch(engineTag: EngineVersionFormat, battle: Battle) : Promise<void>;
    public async launch(engineTag: EngineVersionFormat, startScript: string) : Promise<void>;
    public async launch(engineTag: EngineVersionFormat, battleOrStartScript: Battle | string) : Promise<void> {
        const enginePath = path.join(this.dataDir, "engine", engineTag).replaceAll("\\", "/");
        const scriptPath = path.join(this.dataDir, "barlobby_script.txt");

        let scriptStr = "";
        if (typeof battleOrStartScript === "object") {
            scriptStr = this.scriptConverter.generateScriptStr(battleOrStartScript);
        } else {
            scriptStr = battleOrStartScript;
        }

        await fs.promises.writeFile(scriptPath, scriptStr);

        const args = [
            "--write-dir", this.dataDir,
            "--isolation",
            scriptPath
        ];

        this.gameProcess = spawn("spring.exe", args, {
            cwd: enginePath,
            stdio: "ignore",
            detached: true
        });
    }
}