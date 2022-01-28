import * as fs from "fs";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";
import { ScriptConverter, Script } from "start-script-converter";
import { EngineTagFormat } from "@/model/formats";

export class GameAPI {
    public gameProcess?: ChildProcess;

    protected scriptConverter = new ScriptConverter();

    public async launch(engineTag: EngineTagFormat, script: Script) {
        const enginePath = path.join(window.api.settings.model.dataDir.value, "engine", engineTag).replaceAll("\\", "/");
        const scriptPath = path.join(window.api.settings.model.dataDir.value, "_script.txt");

        const scriptStr = this.scriptConverter.generateScript(script);

        await fs.promises.writeFile(scriptPath, scriptStr);

        const args = [
            "--write-dir", window.api.settings.model.dataDir.value,
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