// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "child_process";
import Ajv2020 from "ajv/dist/2020";
import { Type } from "@sinclair/typebox";
import { ENGINE_CONFIG_VARS_PATH, ENGINE_SCRATCH_PATH, getEnginePath } from "@main/config/app";
import { ConfigVars } from "@shared/engine-settings/config-vars";
import { holdEngineDir } from "@main/content/engine/engine-dir-lock";
import { writeFileAtomic } from "@main/utils/atomic-write";
import { logger } from "@main/utils/logger";

const log = logger("config-vars.ts");

const CACHE_FORMAT_VERSION = 1;
const LIST_TIMEOUT_MS = 30_000;
// After being told to stop, how long a listing has before it is killed.
const KILL_GRACE_MS = 5_000;
// Every view and setting change asks, and a listing that failed can take the whole timeout to fail again.
const RETRY_AFTER_FAILURE_MS = 5 * 60_000;

const ConfigVarsCache = Type.Object({
    formatVersion: Type.Literal(CACHE_FORMAT_VERSION),
    engineVersion: Type.String(),
    vars: ConfigVars,
});

const ajv = new Ajv2020({ strict: true, allErrors: true });
const validateVars = ajv.compile<ConfigVars>(ConfigVars);
const validateCache = ajv.compile<{ formatVersion: number; engineVersion: string; vars: ConfigVars }>(ConfigVarsCache);

const pending = new Map<string, Promise<ConfigVars | undefined>>();
const failedAt = new Map<string, number>();

/**
 * The engine's own description of its config variables, or undefined if it can't be had. An engine version
 * never changes, so the answer is cached on disk for good. A failure is remembered for a while, or until the
 * engine is installed again; calls made while one is running share it.
 */
export function getConfigVars(engineVersion: string): Promise<ConfigVars | undefined> {
    const failed = failedAt.get(engineVersion);
    if (failed !== undefined && Date.now() - failed >= RETRY_AFTER_FAILURE_MS) {
        forgetFailure(engineVersion);
    }
    let result = pending.get(engineVersion);
    if (!result) {
        result = loadConfigVars(engineVersion);
        pending.set(engineVersion, result);
        result.then((vars) => {
            if (!vars && pending.get(engineVersion) === result) {
                failedAt.set(engineVersion, Date.now());
            }
        });
    }

    return result;
}

// For a newly installed engine, which may have failed to list before it was there.
export function relistConfigVars(engineVersion: string): Promise<ConfigVars | undefined> {
    if (failedAt.has(engineVersion)) {
        forgetFailure(engineVersion);
    }

    return getConfigVars(engineVersion);
}

function forgetFailure(engineVersion: string) {
    failedAt.delete(engineVersion);
    pending.delete(engineVersion);
}

const cachePath = (engineVersion: string) => path.join(ENGINE_CONFIG_VARS_PATH, `${engineVersion}.json`);

async function loadConfigVars(engineVersion: string): Promise<ConfigVars | undefined> {
    const cached = await readCache(engineVersion);
    if (cached) {
        return cached;
    }
    try {
        // Not behind the checksum queue, which can hold every installed map's checksum.
        const vars = parseListOutput(await holdEngineDir(engineVersion, () => listConfigVars(engineVersion)));
        await writeFileAtomic(cachePath(engineVersion), JSON.stringify({ formatVersion: CACHE_FORMAT_VERSION, engineVersion, vars }));

        return vars;
    } catch (err) {
        log.warn(`Could not list the config variables of engine ${engineVersion}: ${err instanceof Error ? err.message : String(err)}`);

        return undefined;
    }
}

// A cache that can't be used is listed again and overwritten: it is the client's own, and nothing is lost.
async function readCache(engineVersion: string): Promise<ConfigVars | undefined> {
    try {
        const value: unknown = JSON.parse(await fs.readFile(cachePath(engineVersion), "utf8"));

        return validateCache(value) && value.engineVersion === engineVersion ? value.vars : undefined;
    } catch {
        return undefined;
    }
}

// The engine prints the JSON on its own, but anything else on stdout is skipped rather than trusted not to be there.
export function parseListOutput(stdout: string): ConfigVars {
    const start = stdout.indexOf("{");
    const end = stdout.lastIndexOf("}");
    if (start < 0 || end < start) {
        throw new Error("No JSON in the output");
    }
    const value: unknown = JSON.parse(stdout.slice(start, end + 1));
    if (!validateVars(value)) {
        throw new Error(`Unexpected output: ${ajv.errorsText(validateVars.errors)}`);
    }

    return value;
}

// Headless prints the same list as the full engine, graphics variables included, and can never open a window.
// The scratch write dir and config keep it off the user's files; neither needs to exist. Each engine version
// has its own, since every installed version is listed at once.
function listConfigVars(engineVersion: string): Promise<string> {
    const enginePath = path.join(getEnginePath(), engineVersion);
    const binaryPath = path.join(enginePath, process.platform === "win32" ? "spring-headless.exe" : "spring-headless");
    const scratch = path.join(ENGINE_SCRATCH_PATH, "list-config-vars", engineVersion);
    const args = ["--write-dir", scratch, "--isolation", "--config", `${scratch}.cfg`, "--list-config-vars"];

    return new Promise((resolve, reject) => {
        const proc = spawn(binaryPath, args, { cwd: enginePath, stdio: ["ignore", "pipe", "ignore"] });
        const chunks: Buffer[] = [];
        let timedOut = false;
        let killTimer: ReturnType<typeof setTimeout> | undefined;
        // Settles only once the process has exited, since the engine's directory is held until then.
        const timeout = setTimeout(() => {
            timedOut = true;
            proc.kill();
            killTimer = setTimeout(() => proc.kill("SIGKILL"), KILL_GRACE_MS);
        }, LIST_TIMEOUT_MS);
        proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
        proc.on("error", (err) => {
            clearTimeout(timeout);
            clearTimeout(killTimer);
            reject(err);
        });
        proc.on("exit", () => {
            if (timedOut) {
                clearTimeout(killTimer);
                reject(new Error(`Timed out after ${LIST_TIMEOUT_MS / 1000} s`));
            }
        });
        proc.on("close", (code) => {
            clearTimeout(timeout);
            clearTimeout(killTimer);
            if (timedOut) {
                reject(new Error(`Timed out after ${LIST_TIMEOUT_MS / 1000} s`));
            } else if (code === 0) {
                resolve(Buffer.concat(chunks).toString("utf8"));
            } else {
                reject(new Error(`Exited with code ${code}`));
            }
        });
    });
}
