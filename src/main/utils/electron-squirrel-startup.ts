import path from "path";
import { spawn } from "child_process";
import { app } from "electron";

//Copied from https://github.com/mongodb-js/electron-squirrel-startup/blob/master/index.js due to missing ESM support

function run(args: string[], done: () => void) {
    const updateExe = path.resolve(path.dirname(process.execPath), "..", "Update.exe");
    console.debug("Spawning `%s` with args `%s`", updateExe, args);
    spawn(updateExe, args, {
        detached: true,
    }).on("close", done);
}

function check(): boolean {
    if (process.platform === "win32") {
        const cmd = process.argv[1];
        console.debug("processing squirrel command `%s`", cmd);
        const target = path.basename(process.execPath);

        if (cmd === "--squirrel-install" || cmd === "--squirrel-updated") {
            run(["--createShortcut=" + target + ""], app.quit);
            return true;
        }
        if (cmd === "--squirrel-uninstall") {
            run(["--removeShortcut=" + target + ""], app.quit);
            return true;
        }
        if (cmd === "--squirrel-obsolete") {
            app.quit();
            return true;
        }
    }
    return false;
}

export default check();
