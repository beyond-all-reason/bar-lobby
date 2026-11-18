// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConfigVars } from "@shared/engine-settings/config-vars";

const { state, ipc } = vi.hoisted(() => ({
    state: { dir: "", defaults: {} as Record<string, string | number>, vars: undefined as ConfigVars | undefined },
    ipc: { handlers: new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>(), sent: [] as Array<[string, unknown]> },
}));

vi.mock("electron", () => ({}));
vi.mock("@main/typed-ipc", () => ({ ipcMain: { handle: (channel: string, handler: (event: unknown, ...args: unknown[]) => Promise<unknown>) => ipc.handlers.set(channel, handler) } }));
vi.mock("@main/utils/logger", () => ({ logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }));
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
vi.mock("@main/game/engine-config/config-vars", () => ({ getConfigVars: vi.fn(async () => state.vars) }));
vi.mock("@main/content/content-api", () => ({ contentAPI: { installed: () => [] } }));

const synced = () => path.join(state.dir, "saves", "local", "settings", "engine.json");
const device = () => path.join(state.dir, "config", "engine-device.json");
const userCfg = () => path.join(state.dir, "data", "springsettings.cfg");
const values = async (p: string) => JSON.parse(await fs.readFile(p, "utf8")).values;
const writeText = async (p: string, text: string) => {
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, text);
};

// The module keeps its gate and status for the life of the process, so each test loads its own.
async function load() {
    const engineConfig = await import("@main/game/engine-config/engine-config");
    const { engineSettingsService } = await import("@main/services/engine-settings.service");
    engineSettingsService.registerIpcHandlers({ send: (channel: string, view: unknown) => ipc.sent.push([channel, view]) } as never);
    await engineConfig.init();

    return engineConfig;
}

const call = (channel: string, ...args: unknown[]) => ipc.handlers.get(channel)!({}, ...args);

beforeEach(async () => {
    state.dir = await fs.mkdtemp(path.join(os.tmpdir(), "bar-engine-settings-service-"));
    state.defaults = { snd_volmaster: 30, ui_scale: 1 };
    state.vars = {
        snd_volmaster: { type: "int", defaultValue: 60 },
        snd_volmusic: { type: "int", defaultValue: 50 },
        XResolution: { type: "int", defaultValue: 0 },
        AdvSky: { type: "bool", deprecated: 1 },
    };
    ipc.handlers.clear();
    ipc.sent.length = 0;
    vi.resetModules();
});

afterEach(async () => {
    await fs.rm(state.dir, { recursive: true, force: true });
});

describe("engineSettings:get", () => {
    it("gives the overrides with where each is kept, the client's defaults and the engine's", async () => {
        await writeText(synced(), JSON.stringify({ formatVersion: 1, values: { snd_volmusic: "20" } }));
        await writeText(device(), JSON.stringify({ formatVersion: 1, values: { XResolution: "3840" } }));
        await load();

        expect(await call("engineSettings:get")).toEqual({
            status: "success",
            data: {
                status: { usable: true },
                overrides: { snd_volmusic: { value: "20", scope: "synced" }, XResolution: { value: "3840", scope: "device" } },
                clientDefaults: { snd_volmaster: "30", ui_scale: "1" },
                engineDefaults: { snd_volmaster: "60", snd_volmusic: "50", XResolution: "0" },
            },
        });
    });

    it("gives no engine defaults when the engine's variables can't be listed", async () => {
        state.vars = undefined;
        await load();

        expect(await call("engineSettings:get")).toMatchObject({ data: { engineDefaults: {} } });
    });

    it("reports a master file it can't use instead of failing", async () => {
        await writeText(synced(), JSON.stringify({ formatVersion: 2, values: {} }));
        await load();

        expect(await call("engineSettings:get")).toMatchObject({ status: "success", data: { status: { usable: false, problem: expect.stringContaining("newer client") }, overrides: {} } });
    });
});

describe("engineSettings:set and engineSettings:reset", () => {
    it("routes the override, answers with the view and tells the renderer", async () => {
        await load();

        const result = await call("engineSettings:set", "XResolution", "2560");

        expect(result).toMatchObject({ status: "success", data: { overrides: { XResolution: { value: "2560", scope: "device" } } } });
        expect(await values(device())).toEqual({ XResolution: "2560" });
        await vi.waitFor(() => expect(ipc.sent).toEqual([["engineSettings:changed", (result as { data: unknown }).data]]));
    });

    it("removes the override for a value equal to the client's default, or else the engine's", async () => {
        await writeText(synced(), JSON.stringify({ formatVersion: 1, values: { snd_volmaster: "50", snd_volmusic: "20" } }));
        await load();

        await call("engineSettings:set", "snd_volmaster", "30");
        await call("engineSettings:set", "snd_volmusic", "50");

        expect(await values(synced())).toEqual({});
    });

    it("resets a setting to its default", async () => {
        await writeText(synced(), JSON.stringify({ formatVersion: 1, values: { snd_volmusic: "20" } }));
        await load();

        expect(await call("engineSettings:reset", "snd_volmusic")).toMatchObject({ status: "success", data: { overrides: {} } });
        expect(await values(synced())).toEqual({});
    });

    it("tells nobody when nothing changed", async () => {
        await load();

        await call("engineSettings:reset", "snd_volmusic");

        expect(ipc.sent).toEqual([]);
    });

    it.each([
        ["a game-owned key", "snd_volbattle", "50"],
        ["a value with a line break", "snd_volmusic", "1\nAdvSky = 1"],
        ["a key with an =", "a=b", "1"],
    ])("refuses %s", async (_case, key, value) => {
        await load();

        expect(await call("engineSettings:set", key, value)).toMatchObject({ status: "failed", reason: "invalid_setting" });
        await expect(fs.stat(synced())).rejects.toThrow();
    });

    it("refuses while a master file can't be used, leaving it alone", async () => {
        const text = JSON.stringify({ formatVersion: 2, values: {} });
        await writeText(synced(), text);
        await load();

        expect(await call("engineSettings:set", "snd_volmusic", "20")).toMatchObject({ status: "failed", reason: "settings_unusable" });
        expect(await fs.readFile(synced(), "utf8")).toBe(text);
    });
});

describe("a change made while a game is running", () => {
    it("is applied at the next launch, unless the game changed the same setting", async () => {
        const { beginSession } = await load();
        const session = await beginSession("2026.07.04");

        await call("engineSettings:set", "snd_volmusic", "10");
        await call("engineSettings:set", "ui_scale", "1.1");
        // The game changes ui_scale too before it closes, and its value wins.
        await writeText(userCfg(), "ui_scale = 0.9\n");
        await session.end();

        expect(await values(synced())).toEqual({ snd_volmusic: "10", ui_scale: "0.9" });

        await beginSession("2026.07.04");
        expect(await fs.readFile(userCfg(), "utf8")).toBe("snd_volmusic = 10\nui_scale = 0.9\n");
    });
});
