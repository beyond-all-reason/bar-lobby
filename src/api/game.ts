import { spawn, ChildProcess } from "child_process";
import { ScriptConverter, Script } from "start-script-converter";
import * as fs from "fs";

export class GameAPI {
    public gameProcess?: ChildProcess;

    protected scriptConverter = new ScriptConverter();

    public async launch(script: Script) {
        const dir = "C:/Users/jaspe/AppData/Local/Programs/Beyond-All-Reason/data/engine/105.1.1-659-g800da82 bar";
        const scriptPath = `${dir}/script.txt`;

        const scriptStr = this.scriptConverter.generateScript(script);

        await fs.promises.writeFile(scriptPath, scriptStr);

        this.gameProcess = spawn("spring.exe", [scriptPath], {
            cwd: dir,
            stdio: "ignore",
            detached: true
        });
    }
}