// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isDeprecated } from "@shared/engine-settings/config-vars";

type FakeProcess = EventEmitter & { stdout: EventEmitter; kill: () => void; binary: string; args: string[]; cwd: string };

const { state } = vi.hoisted(() => ({ state: { dir: "", processes: [] as FakeProcess[], held: 0 } }));

vi.mock("@main/utils/logger", () => ({ logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }));
vi.mock("@main/config/app", () => ({
    getEnginePath: () => path.join(state.dir, "engine"),
    get ENGINE_CONFIG_VARS_PATH() {
        return path.join(state.dir, "engine-config", "config-vars");
    },
    get ENGINE_SCRATCH_PATH() {
        return path.join(state.dir, "engine-config", "scratch");
    },
}));
vi.mock("@main/utils/checksums", () => ({
    holdChecksums: async <T>(work: () => Promise<T>) => {
        state.held++;
        try {
            return await work();
        } finally {
            state.held--;
        }
    },
}));
vi.mock("child_process", () => ({
    // A process that only answers when the test says so.
    spawn: (binary: string, args: string[], options: { cwd: string }) => {
        const proc = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), binary, args, cwd: options.cwd, kill: () => proc.emit("close", null) }) as FakeProcess;
        state.processes.push(proc);

        return proc;
    },
}));

const engineVersion = "2026.07.04";

// The shapes the engine prints: flags and booleans as numbers, some defaults as strings.
const vars = {
    snd_volmaster: { declarationFile: "rts/System/Sound/ISound.cpp", declarationLine: 33, description: "Master sound volume.", defaultValue: 60, minimumValue: 0, maximumValue: 200, type: "int" },
    AdvSky: { declarationFile: "rts/Rendering/Env/ISky.cpp", declarationLine: 21, deprecated: 1, type: "bool" },
    FontFile: { declarationFile: "rts/Rendering/Fonts/glFont.cpp", declarationLine: 30, defaultValue: "fonts/FreeSansBold.otf", type: "std::string" },
};

// Each test gets a fresh module, since what it has listed is remembered for the life of the process.
const load = async () => (await import("@main/game/engine-config/config-vars")).getConfigVars;
// The module reads its cache from disk before spawning, so this waits on I/O for a time, not a count of ticks:
// a slow CI runner's disk can take longer than any fixed number of ticks.
async function spawned(count = 1) {
    await vi.waitFor(
        () => {
            if (state.processes.length < count) throw new Error("Nothing was spawned");
        },
        { timeout: 5000, interval: 5 }
    );
}
const cacheFile = () => path.join(state.dir, "engine-config", "config-vars", `${engineVersion}.json`);

async function answer(stdout: string, code: number | null = 0) {
    await spawned();
    const proc = state.processes.shift()!;
    proc.stdout.emit("data", Buffer.from(stdout));
    proc.emit("close", code);
}

beforeEach(async () => {
    state.dir = await fs.mkdtemp(path.join(os.tmpdir(), "bar-config-vars-"));
    state.processes.length = 0;
    vi.resetModules();
});

afterEach(async () => {
    vi.useRealTimers();
    await fs.rm(state.dir, { recursive: true, force: true });
});

describe("getConfigVars", () => {
    it("lists through headless with scratch files, holding checksums, from the engine's directory", async () => {
        const getConfigVars = await load();
        const result = getConfigVars(engineVersion);
        await spawned();

        const [proc] = state.processes;
        const scratch = path.join(state.dir, "engine-config", "scratch", "list-config-vars");
        expect(path.basename(proc.binary)).toMatch(/^spring-headless(\.exe)?$/);
        expect(proc.cwd).toBe(path.join(state.dir, "engine", engineVersion));
        expect(proc.args).toEqual(["--write-dir", scratch, "--isolation", "--config", `${scratch}.cfg`, "--list-config-vars"]);
        expect(state.held).toBe(1);

        await answer(JSON.stringify(vars));
        expect(await result).toEqual(vars);
        expect(state.held).toBe(0);
    });

    it("skips anything printed around the JSON", async () => {
        const getConfigVars = await load();
        const result = getConfigVars(engineVersion);
        await answer(`[t=00:00:00] some log line\n${JSON.stringify(vars, null, 2)}\nanother line\n`);

        expect(await result).toEqual(vars);
    });

    it("caches the list on disk and reads it from there next time", async () => {
        const first = (await load())(engineVersion);
        await answer(JSON.stringify(vars));
        await first;

        expect(JSON.parse(await fs.readFile(cacheFile(), "utf8"))).toEqual({ formatVersion: 1, engineVersion, vars });

        vi.resetModules();
        expect(await (await load())(engineVersion)).toEqual(vars);
        expect(state.processes).toEqual([]);
    });

    it("spawns once for calls made while one is running", async () => {
        const getConfigVars = await load();
        const results = [getConfigVars(engineVersion), getConfigVars(engineVersion), getConfigVars(engineVersion)];
        await spawned();
        for (let i = 0; i < 50; i++) await new Promise<void>((resolve) => setImmediate(resolve));

        expect(state.processes).toHaveLength(1);

        await answer(JSON.stringify(vars));
        expect(await Promise.all(results)).toEqual([vars, vars, vars]);
    });

    it.each([
        ["a non-zero exit", "", 1],
        ["no JSON", "Error: unknown option", 0],
        ["JSON of another shape", JSON.stringify({ snd_volmaster: { defaultValue: 60 } }), 0],
    ])("gives undefined for %s, caches nothing and tries again next time", async (_case, stdout, code) => {
        const getConfigVars = await load();
        const failed = getConfigVars(engineVersion);
        await answer(stdout, code);

        expect(await failed).toBeUndefined();
        await expect(fs.stat(cacheFile())).rejects.toThrow();

        const retried = getConfigVars(engineVersion);
        await answer(JSON.stringify(vars));
        expect(await retried).toEqual(vars);
    });

    it("gives undefined when the engine can't be started", async () => {
        const getConfigVars = await load();
        const result = getConfigVars(engineVersion);
        await spawned();
        state.processes.shift()?.emit("error", new Error("spawn ENOENT"));

        expect(await result).toBeUndefined();
    });

    it("kills the engine and gives undefined when it takes too long", async () => {
        const getConfigVars = await load();
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const result = getConfigVars(engineVersion);
        await spawned();
        const kill = vi.spyOn(state.processes[0], "kill");
        await vi.advanceTimersByTimeAsync(30_000);

        expect(kill).toHaveBeenCalled();
        expect(await result).toBeUndefined();
    });

    it.each([
        ["for another engine version", JSON.stringify({ formatVersion: 1, engineVersion: "2025.06.21", vars })],
        ["that isn't valid", '{"formatVersion": 1, "engi'],
    ])("lists again over a cache %s", async (_case, text) => {
        await fs.mkdir(path.dirname(cacheFile()), { recursive: true });
        await fs.writeFile(cacheFile(), text);

        const result = (await load())(engineVersion);
        await answer(JSON.stringify(vars));

        expect(await result).toEqual(vars);
        expect(JSON.parse(await fs.readFile(cacheFile(), "utf8")).engineVersion).toBe(engineVersion);
    });
});

describe("isDeprecated", () => {
    it("is true only for a variable the engine marks deprecated", () => {
        expect(isDeprecated(vars, "AdvSky")).toBe(true);
        expect(isDeprecated(vars, "snd_volmaster")).toBe(false);
        expect(isDeprecated(vars, "ui_scale")).toBe(false);
        expect(isDeprecated(vars, "constructor")).toBe(false);
    });
});
