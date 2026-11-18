// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConfigVars } from "@shared/engine-settings/config-vars";

const { state, logged } = vi.hoisted(() => ({
    state: {
        dir: "",
        defaults: {} as Record<string, string | number>,
        vars: undefined as ConfigVars | undefined,
        // Engines found installed, and what each one other than the default lists.
        installed: [] as string[],
        varsByVersion: {} as Record<string, ConfigVars>,
    },
    logged: { info: [] as string[], error: [] as string[] },
}));

vi.mock("@main/utils/logger", () => ({
    logger: () => ({ debug: vi.fn(), info: (text: string) => logged.info.push(text), warn: vi.fn(), error: (text: string) => logged.error.push(text) }),
}));
vi.mock("@main/config/app", () => ({
    PROFILE_ID: "local",
    get WRITE_DATA_PATH() {
        return path.join(state.dir, "data");
    },
    get CONFIG_PATH() {
        return path.join(state.dir, "config");
    },
    get ENGINE_CONFIG_PATH() {
        return path.join(state.dir, "engine-config");
    },
    get ENGINE_DEFAULTS_PATH() {
        return path.join(state.dir, "engine-config", "defaults");
    },
    getSyncedSettingsPath: (profileId: string) => path.join(state.dir, "saves", profileId, "settings"),
}));
vi.mock("@main/services/config.service", () => ({ configService: { getConfig: () => ({ springSettings: state.defaults }) } }));
vi.mock("@main/config/install-defaults", () => ({ getDefaultEngineVersion: () => "2026.07.04" }));
vi.mock("@main/game/engine-config/config-vars", () => ({ getConfigVars: vi.fn(async (version: string) => state.varsByVersion[version] ?? state.vars) }));
vi.mock("@main/content/content-api", () => ({ contentAPI: { installed: () => state.installed.map((id) => ({ type: "engine", id })) } }));

const file = (...parts: string[]) => path.join(state.dir, ...parts);
const userCfg = () => file("data", "springsettings.cfg");
const synced = (profileId = "local") => file("saves", profileId, "settings", "engine.json");
const device = () => file("config", "engine-device.json");
const snapshot = () => file("engine-config", "applied.json");

const exists = (p: string) =>
    fs.stat(p).then(
        () => true,
        () => false
    );
const readJson = async (p: string) => JSON.parse(await fs.readFile(p, "utf8"));
const values = async (p: string) => (await readJson(p)).values;
const writeText = async (p: string, text: string) => {
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, text);
};
const writeMaster = (p: string, v: Record<string, string>) => writeText(p, JSON.stringify({ formatVersion: 1, values: v }));
const cfgText = (v: Record<string, string>) =>
    Object.entries(v)
        .map(([key, value]) => `${key} = ${value}\n`)
        .join("");

// The module keeps its gate and status for the life of the process, so each test loads its own.
const load = async () => import("@main/game/engine-config/engine-config");

beforeEach(async () => {
    state.dir = await fs.mkdtemp(path.join(os.tmpdir(), "bar-engine-config-"));
    state.defaults = { snd_volmaster: 30, ui_scale: 1, CamTimeExponent: 4.0 };
    state.vars = { snd_volmaster: { type: "int" }, AdvSky: { type: "bool", deprecated: 1 } };
    state.installed = [];
    state.varsByVersion = {};
    logged.info.length = 0;
    logged.error.length = 0;
    vi.resetModules();
});

afterEach(async () => {
    await fs.rm(state.dir, { recursive: true, force: true });
});

describe("startup: adopting an existing file", () => {
    it("backs the file up, drops defaults and corrupt keys, routes the rest, and logs every drop", async () => {
        const original = cfgText({ snd_volmaster: "30", snd_volmusic: "20", ui_opacity: "0.6", acity: "0.6", XResolution: "2560", Shadows: "2" });
        await writeText(userCfg(), original);
        const { init, getStatus } = await load();

        await init();

        expect(getStatus()).toEqual({ usable: true });
        expect(await fs.readFile(file("engine-config", "springsettings.pre-migration.cfg"), "utf8")).toBe(original);
        expect(await values(synced())).toEqual({ snd_volmusic: "20", ui_opacity: "0.6" });
        expect(await values(device())).toEqual({ Shadows: "2", XResolution: "2560" });
        expect(logged.info).toEqual(
            expect.arrayContaining([expect.stringMatching(/Dropped snd_volmaster = 30: equal to the client's default/), expect.stringMatching(/Dropped acity = 0.6: left over/)])
        );
        // Not rewritten until a launch.
        expect(await fs.readFile(userCfg(), "utf8")).toBe(original);
        expect(await readJson(snapshot())).toEqual({
            formatVersion: 1,
            profileId: "local",
            values: { snd_volmaster: "30", snd_volmusic: "20", ui_opacity: "0.6", acity: "0.6", XResolution: "2560", Shadows: "2" },
        });
    });

    it("keeps the master's synced keys and takes the file's device keys, as on a machine the cloud filled", async () => {
        await writeMaster(synced(), { ui_scale: "0.8" });
        await writeMaster(device(), { XResolution: "1920" });
        await writeText(userCfg(), cfgText({ ui_scale: "1.2", XResolution: "2560", snd_volmusic: "20" }));
        const { init } = await load();

        await init();

        expect(await values(synced())).toEqual({ snd_volmusic: "20", ui_scale: "0.8" });
        expect(await values(device())).toEqual({ XResolution: "2560" });
    });

    // A locked campaign engine is installed beside the default, and a key only it knows is still real.
    it("keeps a key any installed engine knows, even where it ends another key with the same value", async () => {
        state.installed = ["2026.07.04", "2025.06.21"];
        state.varsByVersion = { "2025.06.21": { ExposureMult: { type: "float" } } };
        await writeText(userCfg(), cfgText({ ExposureMult: "1", unitExposureMult: "1", acity: "0.6", ui_opacity: "0.6" }));

        await (await load()).init();

        expect(await values(synced())).toEqual({ ExposureMult: "1", ui_opacity: "0.6", unitExposureMult: "1" });
    });

    it("asks the default engine when no engine was found installed", async () => {
        state.vars = { ExposureMult: { type: "float" } };
        await writeText(userCfg(), cfgText({ ExposureMult: "1", unitExposureMult: "1" }));

        await (await load()).init();

        expect(await values(synced())).toEqual({ ExposureMult: "1", unitExposureMult: "1" });
    });

    it("backs up only once", async () => {
        const backup = file("engine-config", "springsettings.pre-migration.cfg");
        await writeText(backup, "first = 1\n");
        await writeText(userCfg(), cfgText({ snd_volmusic: "20" }));

        await (await load()).init();

        expect(await fs.readFile(backup, "utf8")).toBe("first = 1\n");
    });

    it("writes no master for a first run with no file, but records that adoption happened", async () => {
        await (await load()).init();

        expect(await exists(synced())).toBe(false);
        expect(await exists(device())).toBe(false);
        expect(await readJson(snapshot())).toEqual({ formatVersion: 1, profileId: "local", values: {} });
    });
});

describe("a launch", () => {
    it("writes the defaults layer, the user's overrides and a snapshot, then records the pid", async () => {
        await writeMaster(synced(), { snd_volmusic: "20" });
        await writeMaster(device(), { XResolution: "2560" });
        const { init, beginSession } = await load();
        await init();

        const session = await beginSession("2026.07.04");

        // Numbers as JavaScript prints them, as the client wrote them before this layer existed.
        expect(await fs.readFile(file("engine-config", "defaults", "springsettings.cfg"), "utf8")).toBe("CamTimeExponent = 4\nsnd_volmaster = 30\nui_scale = 1\n");
        expect(await fs.readFile(userCfg(), "utf8")).toBe("XResolution = 2560\nsnd_volmusic = 20\n");
        expect(await readJson(snapshot())).toEqual({ formatVersion: 1, profileId: "local", engineVersion: "2026.07.04", values: { XResolution: "2560", snd_volmusic: "20" } });

        session.started(1234);
        await session.end();
        expect((await readJson(snapshot())).pid).toBeUndefined();
    });

    it("folds what the game changed and removed back into the master copy when it ends", async () => {
        await writeMaster(synced(), { snd_volmusic: "20", ui_scale: "0.9" });
        const { init, beginSession, onChanged } = await load();
        await init();
        const changed = vi.fn();
        onChanged.add(changed);

        const session = await beginSession("2026.07.04");
        session.started(1234);
        // As the game would: a new volume and resolution, and ui_scale set back to its default and so removed.
        await writeText(userCfg(), cfgText({ snd_volmusic: "20", snd_volmaster: "50", XResolution: "1920" }));
        await session.end();

        expect(await values(synced())).toEqual({ snd_volmaster: "50", snd_volmusic: "20" });
        expect(await values(device())).toEqual({ XResolution: "1920" });
        expect(changed).toHaveBeenCalled();
        expect(await readJson(snapshot())).toEqual({ formatVersion: 1, profileId: "local", engineVersion: "2026.07.04", values: { XResolution: "1920", snd_volmaster: "50", snd_volmusic: "20" } });
    });

    it("keeps a setting the engine removed as deprecated, for older engines", async () => {
        await writeMaster(synced(), { snd_volmusic: "20" });
        await writeMaster(device(), { AdvSky: "1" });
        const { init, beginSession } = await load();
        await init();

        const session = await beginSession("2026.07.04");
        await writeText(userCfg(), cfgText({}));
        await session.end();

        expect(await values(synced())).toEqual({});
        expect(await values(device())).toEqual({ AdvSky: "1" });
    });

    it("treats every removal as a reset when the engine's variables can't be listed", async () => {
        state.vars = undefined;
        await writeMaster(device(), { AdvSky: "1" });
        const { init, beginSession } = await load();
        await init();

        const session = await beginSession("2026.07.04");
        await writeText(userCfg(), cfgText({}));
        await session.end();

        expect(await values(device())).toEqual({});
    });

    it("adopts hand edits made between launches before writing over the file", async () => {
        await writeMaster(synced(), { snd_volmusic: "20" });
        const { init, beginSession } = await load();
        await init();
        await (await beginSession("2026.07.04")).end();

        await writeText(userCfg(), cfgText({ snd_volmusic: "20", ui_opacity: "0.5" }));
        await beginSession("2026.07.04");

        expect(await values(synced())).toEqual({ snd_volmusic: "20", ui_opacity: "0.5" });
        expect(await fs.readFile(userCfg(), "utf8")).toBe("snd_volmusic = 20\nui_opacity = 0.5\n");
    });

    it("applies a master the cloud replaced between launches", async () => {
        await writeMaster(synced(), { snd_volmusic: "20" });
        const { init, beginSession } = await load();
        await init();
        await (await beginSession("2026.07.04")).end();

        await writeMaster(synced(), { snd_volmusic: "5", ui_scale: "1.1" });
        await beginSession("2026.07.04");

        expect(await fs.readFile(userCfg(), "utf8")).toBe("snd_volmusic = 5\nui_scale = 1.1\n");
    });

    it("waits for the previous session to end before the next begins", async () => {
        const { init, beginSession } = await load();
        await init();
        const first = await beginSession("2026.07.04");

        let secondBegan = false;
        const second = beginSession("2026.07.04").then((session) => {
            secondBegan = true;
            return session;
        });
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(secondBegan).toBe(false);

        await first.end();
        await (await second).end();
        expect(secondBegan).toBe(true);
    });

    it("ends only once however often end is called", async () => {
        const { init, beginSession } = await load();
        await init();
        const session = await beginSession("2026.07.04");

        await Promise.all([session.end(), session.end()]);
        await (await beginSession("2026.07.04")).end();
    });
});

describe("game-owned keys", () => {
    it("neither keeps nor reports the game's own writes, and carries them through to the next launch", async () => {
        await writeMaster(synced(), { snd_volmusic: "20" });
        const { init, beginSession, onChanged } = await load();
        await init();
        const changed = vi.fn();
        onChanged.add(changed);

        const session = await beginSession("2026.07.04");
        // As the game does on every launch and during play, with nothing touched by the player.
        await writeText(userCfg(), cfgText({ snd_volmusic: "20", snd_volbattle: "83", MouseDragSelectionThreshold: "32", music_loadscreen_track: "a.ogg" }));
        logged.info.length = 0;
        await session.end();

        expect(await values(synced())).toEqual({ snd_volmusic: "20" });
        expect(changed).not.toHaveBeenCalled();
        expect(logged.info.filter((line) => line.includes("changed"))).toEqual([]);

        await beginSession("2026.07.04");
        expect(await fs.readFile(userCfg(), "utf8")).toBe(cfgText({ MouseDragSelectionThreshold: "32", music_loadscreen_track: "a.ogg", snd_volbattle: "83", snd_volmusic: "20" }));
    });

    it("clears them from a master copy written before they were known as such, keeping the game's value", async () => {
        await writeMaster(synced(), { snd_volbattle: "50", snd_volmusic: "20" });
        await writeText(userCfg(), cfgText({ snd_volbattle: "83", snd_volmusic: "20" }));
        await writeText(snapshot(), JSON.stringify({ formatVersion: 1, profileId: "local", engineVersion: "2026.07.04", values: { snd_volbattle: "83", snd_volmusic: "20" } }));
        const { init, beginSession } = await load();
        await init();

        await beginSession("2026.07.04");

        expect(await values(synced())).toEqual({ snd_volmusic: "20" });
        expect(await fs.readFile(userCfg(), "utf8")).toBe(cfgText({ snd_volbattle: "83", snd_volmusic: "20" }));
    });

    it("drops them when adopting a file", async () => {
        await writeText(userCfg(), cfgText({ snd_volbattle: "68", snd_volmusic: "20" }));

        await (await load()).init();

        expect(await values(synced())).toEqual({ snd_volmusic: "20" });
        expect(logged.info).toContainEqual(expect.stringMatching(/Dropped snd_volbattle = 68: the game sets it for itself/));
    });
});

describe("an unusable master", () => {
    it.each([
        ["synced, from a newer client", () => synced(), JSON.stringify({ formatVersion: 2, values: {} })],
        ["synced, half synced", () => synced(), '{"formatVersion": 1, "valu'],
        ["on the device", () => device(), JSON.stringify({ formatVersion: 1 })],
    ])("leaves the engine's file and the masters alone when %s", async (_case, master, text) => {
        await writeText(master(), text);
        await writeText(userCfg(), cfgText({ snd_volmusic: "20" }));
        const { init, beginSession, getStatus } = await load();

        await init();
        expect(getStatus()).toEqual({ usable: false, problem: expect.stringContaining(master()) });

        const session = await beginSession("2026.07.04");
        expect(await fs.readFile(userCfg(), "utf8")).toBe("snd_volmusic = 20\n");
        await writeText(userCfg(), cfgText({ snd_volmusic: "40" }));
        await session.end();

        expect(await fs.readFile(master(), "utf8")).toBe(text);
        expect(getStatus().usable).toBe(false);
        // Once fixed, what changed meanwhile is adopted.
        await fs.rm(master());
        await (await beginSession("2026.07.04")).end();
        expect(getStatus()).toEqual({ usable: true });
        expect(await values(synced())).toEqual({ snd_volmusic: "40" });
    });
});

describe("keys whose file changed", () => {
    it("move at startup, even while an earlier game still runs, and are reported with their new scope", async () => {
        await writeMaster(synced(), { FontSize: "18", snd_volmusic: "20" });
        await writeText(snapshot(), JSON.stringify({ formatVersion: 1, profileId: "local", engineVersion: "2026.07.04", pid: process.pid, values: { FontSize: "18", snd_volmusic: "20" } }));
        const { init, onChanged, getView } = await load();
        const changed = vi.fn();
        onChanged.add(changed);

        await init();

        expect(await values(synced())).toEqual({ snd_volmusic: "20" });
        expect(await values(device())).toEqual({ FontSize: "18" });
        expect(changed).toHaveBeenCalled();
        expect((await getView()).overrides.FontSize).toEqual({ value: "18", scope: "device" });
    });

    it("leave nothing to report when every key is already in place", async () => {
        await writeMaster(synced(), { snd_volmusic: "20" });
        await writeMaster(device(), { FontSize: "18" });
        await writeText(userCfg(), cfgText({ FontSize: "18", snd_volmusic: "20" }));
        await writeText(snapshot(), JSON.stringify({ formatVersion: 1, profileId: "local", engineVersion: "2026.07.04", values: { FontSize: "18", snd_volmusic: "20" } }));
        const { init, onChanged } = await load();
        const changed = vi.fn();
        onChanged.add(changed);

        await init();

        expect(changed).not.toHaveBeenCalled();
    });
});

describe("startup after a game outlived the client", () => {
    it("skips folding back while the game is still running", async () => {
        await writeMaster(synced(), { snd_volmusic: "20" });
        await writeText(snapshot(), JSON.stringify({ formatVersion: 1, profileId: "local", engineVersion: "2026.07.04", pid: process.pid, values: { snd_volmusic: "20" } }));
        await writeText(userCfg(), cfgText({ snd_volmusic: "40" }));

        await (await load()).init();

        expect(await values(synced())).toEqual({ snd_volmusic: "20" });
    });

    it("folds back what it changed once it has exited", async () => {
        await writeMaster(synced(), { snd_volmusic: "20" });
        // A pid that can't be a running process.
        await writeText(snapshot(), JSON.stringify({ formatVersion: 1, profileId: "local", engineVersion: "2026.07.04", pid: 2 ** 31 - 1, values: { snd_volmusic: "20" } }));
        await writeText(userCfg(), cfgText({ snd_volmusic: "40" }));

        await (await load()).init();

        expect(await values(synced())).toEqual({ snd_volmusic: "40" });
        expect((await readJson(snapshot())).pid).toBeUndefined();
    });
});

describe("profiles", () => {
    it("folds changes into the profile the file was written for, then applies the current one", async () => {
        await writeMaster(synced("other"), { snd_volmusic: "20" });
        await writeMaster(synced(), { snd_volmusic: "5" });
        await writeText(snapshot(), JSON.stringify({ formatVersion: 1, profileId: "other", engineVersion: "2026.07.04", values: { snd_volmusic: "20" } }));
        await writeText(userCfg(), cfgText({ snd_volmusic: "60" }));
        const { init, beginSession } = await load();

        await init();
        expect(await values(synced("other"))).toEqual({ snd_volmusic: "60" });
        expect(await values(synced())).toEqual({ snd_volmusic: "5" });

        await beginSession("2026.07.04");
        expect(await fs.readFile(userCfg(), "utf8")).toBe("snd_volmusic = 5\n");
    });

    it("starts a new profile from the defaults rather than adopting another's file", async () => {
        await writeText(snapshot(), JSON.stringify({ formatVersion: 1, profileId: "other", values: { snd_volmusic: "60" } }));
        await writeText(userCfg(), cfgText({ snd_volmusic: "60" }));
        const { init, beginSession } = await load();

        await init();
        await beginSession("2026.07.04");

        expect(await exists(synced())).toBe(false);
        expect(await fs.readFile(userCfg(), "utf8")).toBe("");
    });
});
