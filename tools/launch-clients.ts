// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// This script is used to launch multiple instances of the BAR Lobby client with separate terminal windows for logging.
// It uses electron-forge to compile and bundle it once, then spawns the requested number of clients into individual terminals with unique environment variables for state and assets paths.
// This has been tested on Win11 and Linux Mint Cinnamon.

import { spawn, execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline/promises";
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

// 1. Read instance count and an optional config file from the arguments, in either order, e.g. `npm run start:multi 3 config.json`.
// Plain arguments rather than `--flags`, because npm keeps `--flags` for itself unless they come after a `--`.
// The count defaults to 2, and can be left out: `npm run start:multi config.json`.
// Config files must end in .json, so a file such as `1-alpha.json` is never mistaken for a count.
// A launch profiles file (see launchProfilesSchema) can be given instead, e.g. `npm run start:multi configs/launch-profiles.json`.
const USAGE = "Usage: npm run start:multi [count] [config.json]";

function exitWithError(message: string): never {
    console.error(message);
    console.error(USAGE);
    process.exit(1);
}

const args: string[] = process.argv.slice(2);
if (args.length > 2) {
    exitWithError(`Expected at most 2 arguments, got ${args.length}.`);
}

let CLIENT_COUNT: number = 2;
let configPath: string | undefined;
let hasCount = false;
for (const arg of args) {
    if (/^\d+$/.test(arg)) {
        if (hasCount) exitWithError("Only one client count can be given.");
        const count = parseInt(arg, 10);
        if (count < 1) exitWithError("The client count must be at least 1.");
        CLIENT_COUNT = count;
        hasCount = true;
    } else if (arg.toLowerCase().endsWith(".json")) {
        if (configPath) exitWithError("Only one config file can be given.");
        configPath = arg;
    } else {
        exitWithError(`"${arg}" is neither a client count nor a .json config file. Config files must use the .json extension.`);
    }
}

if (configPath && !fs.existsSync(path.resolve(process.cwd(), configPath))) {
    exitWithError(`Config file not found: ${configPath}`);
}

// A launch profiles file lists ready-made setups to pick from. When one is given, the chosen profile replaces the arguments.
// A profile's config is resolved from the working directory, like --config in the client. Leave it out to use the saved, default or remote config.
const launchProfileSchema = Type.Object({
    id: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
    clients: Type.Integer({ minimum: 1 }),
    config: Type.Optional(Type.String({ pattern: "\\.json$" })),
});
const launchProfilesSchema = Type.Object({
    profiles: Type.Array(launchProfileSchema, { minItems: 1 }),
});
type LaunchProfile = Static<typeof launchProfileSchema>;

const EXIT_CHOICE = "exit";

function readLaunchProfiles(filePath: string): LaunchProfile[] | undefined {
    let data: unknown;
    try {
        data = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filePath), "utf-8"));
    } catch {
        // Not valid JSON, so not a profiles file. The client validates it as a config and reports the problem itself.
        return undefined;
    }
    if (typeof data !== "object" || data === null || !("profiles" in data)) return undefined;

    console.log("Provided file is a profile, client count will be read from the chosen profile instead.");
    if (!Value.Check(launchProfilesSchema, data)) {
        console.error(`Launch profiles file does not match the schema: ${filePath}`);
        for (const error of Value.Errors(launchProfilesSchema, data)) {
            console.error(`${error.path} ${error.message}: ${JSON.stringify(error.value)}`);
        }
        process.exit(1);
    }

    const ids = new Set<string>();
    for (const profile of data.profiles) {
        if (profile.id.toLowerCase() === EXIT_CHOICE || /^\d+$/.test(profile.id)) {
            exitWithError(`Profile id "${profile.id}" is reserved: ids cannot be "${EXIT_CHOICE}" or a number.`);
        }
        if (ids.has(profile.id)) exitWithError(`Profile id "${profile.id}" is used more than once.`);
        ids.add(profile.id);
    }
    return data.profiles;
}

async function chooseLaunchProfile(profiles: LaunchProfile[]): Promise<LaunchProfile> {
    console.log("Select a launch profile:");
    profiles.forEach((profile, index) => console.log(`  ${index + 1}) [${profile.id}] ${profile.description}`));
    console.log(`  0) Exit`);

    const cancel = (): never => {
        console.log("Launch cancelled.");
        process.exit(0);
    };
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "> " });
    rl.on("SIGINT", cancel);
    rl.prompt();
    try {
        for await (const line of rl) {
            const answer = line.trim();
            if (answer === "0" || answer.toLowerCase() === EXIT_CHOICE) cancel();
            const chosen = /^\d+$/.test(answer) ? profiles[parseInt(answer, 10) - 1] : profiles.find((profile) => profile.id === answer);
            if (chosen) return chosen;
            console.log(`"${answer}" is not a listed number or id, try again.`);
            rl.prompt();
        }
    } finally {
        rl.close();
    }
    // Input ended (e.g. Ctrl+D) without a choice
    return cancel();
}

const launchProfiles = configPath ? readLaunchProfiles(configPath) : undefined;
if (launchProfiles) {
    const profile = await chooseLaunchProfile(launchProfiles);
    CLIENT_COUNT = profile.clients;
    configPath = profile.config;
    if (configPath && !fs.existsSync(path.resolve(process.cwd(), configPath))) {
        console.error(`Config file for profile "${profile.id}" not found: ${configPath}`);
        process.exit(1);
    }
}

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

            // shell: true joins args with spaces unquoted, so quote them to keep paths with spaces whole (Windows paths can't contain ")
            const quotedArgs = clientArgs.map((arg) => `"${arg}"`);

            spawn("cmd.exe", ["/c", "start", windowTitle, "cmd", "/c", "npx", "electron", ".", ...quotedArgs], {
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

            // Single-quote each arg for bash, closing and escaping any ' inside it
            const runCmd = ["npx electron .", ...clientArgs.map((arg) => `'${arg.replace(/'/g, `'\\''`)}'`)].join(" ");

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
