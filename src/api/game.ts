import * as fs from "fs";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";
import { ScriptConverter, Script } from "start-script-converter";
import { EngineTagFormat } from "@/model/formats";

export class GameAPI {
    public gameProcess?: ChildProcess;

    protected scriptConverter = new ScriptConverter();

    public async launch(engineTag: EngineTagFormat, script: Script) {
        const enginePath = path.join(window.info.contentPath, "engine", engineTag);
        const scriptPath = `${enginePath}/script.txt`;

        const scriptStr = this.scriptConverter.generateScript(script);

        await fs.promises.writeFile(scriptPath, scriptStr);

        this.gameProcess = spawn("spring.exe", [scriptPath], {
            cwd: enginePath,
            stdio: "ignore",
            detached: true
        });
    }
}