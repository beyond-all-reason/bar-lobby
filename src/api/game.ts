import * as fs from "fs";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";
import { EngineTagFormat } from "@/model/formats";
import { StartScriptConverter } from "@/utils/start-script-converter";
import { StartScript } from "@/model/start-script";

export class GameAPI {
    public gameProcess?: ChildProcess;

    protected scriptConverter = new StartScriptConverter();

    constructor(protected userDataDir: string, protected dataDir: string) {
    }

    public async launch(engineTag: EngineTagFormat, script: StartScript) {
        const enginePath = path.join(this.dataDir, "engine", engineTag).replaceAll("\\", "/");
        const scriptPath = path.join(this.dataDir, "_script.txt");

        const scriptStr = this.scriptConverter.generateScript(script);

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