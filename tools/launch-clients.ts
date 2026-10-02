// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// This script is used to launch multiple instances of the BAR Lobby client with separate terminal windows for logging.
// It uses electron-forge to compile and bundle it once, then spawns the requested number of clients into individual terminals with unique environment variables for state and assets paths.
// This has been tested on Win11 and Linux Mint Cinnamon.

import { spawn, execSync } from "child_process";
import os from "os";

// 1. Read instance count and an optional config file from the arguments, e.g. `npm run start:multi 1 config.json`.
// Positional, because npm keeps `--flags` for itself unless they come after a `--`.
// The count defaults to 2, and can be left out: `npm run start:multi config.json`.
const args: string[] = process.argv.slice(2);
const passedCount: number = parseInt(args[0], 10);
const hasCount = !isNaN(passedCount);
const CLIENT_COUNT: number = hasCount && passedCount > 0 ? passedCount : 2;
const configPath: string | undefined = hasCount ? args[1] : args[0];
const clientArgs: string[] = configPath ? ["--config", configPath] : [];

if (configPath) {
    console.log(`Clients will use the local config ${configPath} instead of fetching the remote one.`);
}

console.log(`Preparing to compile and launch ${CLIENT_COUNT} instances...`);

// 2. Compile assets and bundle once via electron-forge
const isWin: boolean = os.platform() === "win32";
const npxCmd: string = isWin ? "npx.cmd" : "npx";
const build = spawn(npxCmd, ["electron-forge", "package"], { shell: true, stdio: "inherit" });

build.on("close", (code: number | null) => {
    if (code !== 0) {
        console.error("Build failed. Aborting launch.");
        process.exit(code ?? 1);
    }

    // 3. Loop and spawn the requested number of clients into individual terminals
    for (let i = 1; i <= CLIENT_COUNT; i++) {
        const suffix: string = i === 1 ? "" : `-${i}`;
        const statePath: string = `state${suffix}`;
        const assetsPath: string = `assets${suffix}`;

        const customEnv: NodeJS.ProcessEnv = {
            ...process.env,
            NODE_ENV: "development",
            NODE_OPTIONS: "--enable-source-maps",
            BAR_STATE_PATH: statePath,
            BAR_ASSETS_PATH: assetsPath,
        };

        console.log(`Spawning Client Shell #${i} -> STATE: ${statePath} | ASSETS: ${assetsPath}`);
        if (isWin) {
            const windowTitle = `"Client #${i} Log Stream"`;

            spawn("cmd.exe", ["/c", "start", windowTitle, "cmd", "/c", "npx", "electron", ".", ...clientArgs], {
                env: customEnv,
                detached: true,
                shell: true,
            });
        } else {
            // Linux Mint Cinnamon native terminal check using an ESM-safe execution check
            let hasGnomeTerminal = false;
            try {
                execSync("which gnome-terminal", { stdio: "ignore" });
                hasGnomeTerminal = true;
            } catch {
                hasGnomeTerminal = false;
            }

            const runCmd = ["npx electron .", ...clientArgs.map((arg) => `'${arg}'`)].join(" ");

            if (hasGnomeTerminal) {
                // gnome-terminal uses -- to separate terminal flags from the executed command
                spawn(
                    "gnome-terminal",
                    [
                        "--title",
                        `Client #${i} Log Stream`,
                        "--",
                        "bash",
                        "-c",
                        `${runCmd}; exec bash`, // '; exec bash' keeps the window open on crash/exit
                    ],
                    {
                        env: customEnv,
                        detached: true,
                        stdio: "ignore",
                    }
                );
            } else {
                // Universal X11 fallback (requires xterm: sudo apt install xterm)
                spawn(
                    "xterm",
                    [
                        "-title",
                        `Client #${i} Log Stream`,
                        "-e",
                        "bash",
                        "-c",
                        `${runCmd}; read -p "Press enter to close..."`, // Alternative keep-open method
                    ],
                    {
                        env: customEnv,
                        detached: true,
                        stdio: "ignore",
                    }
                );
            }
        }
    }

    console.log(`Successfully opened ${CLIENT_COUNT} separate terminal windows tracking live logs.`);
    process.exit(0);
});
