// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { Value } from "@sinclair/typebox/value";
import { configSchema } from "@main/json/model/config";

const store = vi.hoisted(() => ({ dir: "" }));

vi.mock("@main/config/app", () => ({ CONFIG_PATH: store.dir }));
vi.mock("@main/typed-ipc", () => ({ ipcMain: { handle: vi.fn() } }));

// Index of the button chosen on the invalid override dialog: 0 quits, 1 continues without it.
const electronMock = vi.hoisted(() => ({
    dialog: { showMessageBoxSync: vi.fn() },
    app: { exit: vi.fn() },
}));
vi.mock("electron", () => electronMock);
const QUIT = 0;
const CONTINUE = 1;

const configFile = () => path.join(store.dir, "config.json");
const localConfigFile = () => path.join(store.dir, "local-config.json");

function respondWith(body: unknown) {
    return { ok: true, status: 200, statusText: "OK", json: async () => body };
}

let fetchMock: ReturnType<typeof vi.fn>;
const originalArgv = process.argv;

async function loadService() {
    vi.resetModules();
    const { configService } = await import("@main/services/config.service");
    await configService.init();

    return configService;
}

function useLocalConfig(contents: Record<string, unknown>) {
    fs.writeFileSync(localConfigFile(), JSON.stringify(contents));
    process.argv = [originalArgv[0], "app", `--config=${localConfigFile()}`];
}

beforeAll(() => {
    store.dir = fs.mkdtempSync(path.join(os.tmpdir(), "bar-config-"));
});

afterAll(() => {
    fs.rmSync(store.dir, { recursive: true, force: true });
});

beforeEach(() => {
    fs.rmSync(configFile(), { force: true });
    fs.rmSync(localConfigFile(), { force: true });
    process.argv = [originalArgv[0], "app"];
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    electronMock.dialog.showMessageBoxSync.mockReset().mockReturnValue(CONTINUE);
    electronMock.app.exit.mockReset();
});

afterEach(() => {
    process.argv = originalArgv;
    vi.unstubAllGlobals();
});

describe("local config", () => {
    it("never fetches the remote config", async () => {
        useLocalConfig({});
        fetchMock.mockResolvedValue(respondWith({ latestGameVersion: "byar:remote" }));

        const service = await loadService();
        await service.fetchConfig();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("fills what a partial file leaves out with the defaults, not the cached remote values", async () => {
        fetchMock.mockResolvedValue(respondWith({ latestGameVersion: "byar:remote", rapidGame: "remote" }));
        await loadService();

        useLocalConfig({ latestGameVersion: "byar:local" });
        const service = await loadService();

        expect(service.getConfig().latestGameVersion).toBe("byar:local");
        expect(service.getConfig().rapidGame).toBe(Value.Create(configSchema).rapidGame);
    });

    it("ignores a file with a value of the wrong type and fetches the remote config", async () => {
        useLocalConfig({ defaultServers: "wss://not-a-list" });
        fetchMock.mockResolvedValue(respondWith({ latestGameVersion: "byar:remote" }));

        const service = await loadService();

        expect(fetchMock).toHaveBeenCalled();
        expect(service.getConfig().latestGameVersion).toBe("byar:remote");
        expect(service.getConfig().defaultServers).toEqual(Value.Create(configSchema).defaultServers);
    });

    it("ignores a file that is not JSON and fetches the remote config", async () => {
        fs.writeFileSync(localConfigFile(), "{ not json");
        process.argv = [originalArgv[0], "app", `--config=${localConfigFile()}`];
        fetchMock.mockResolvedValue(respondWith({ latestGameVersion: "byar:remote" }));

        const service = await loadService();

        expect(fetchMock).toHaveBeenCalled();
        expect(service.getConfig().latestGameVersion).toBe("byar:remote");
    });

    it("asks before continuing without an invalid file", async () => {
        useLocalConfig({ defaultServers: [] });

        await loadService();

        expect(electronMock.dialog.showMessageBoxSync).toHaveBeenCalledOnce();
        expect(electronMock.app.exit).not.toHaveBeenCalled();
    });

    it("exits when the user chooses to quit over an invalid file", async () => {
        useLocalConfig({ defaultServers: [] });
        electronMock.dialog.showMessageBoxSync.mockReturnValue(QUIT);

        await loadService();

        expect(electronMock.app.exit).toHaveBeenCalledWith(1);
    });

    // config.json is the cache of the remote config, and a launch that can't fetch falls back to it.
    it("is not left behind in the cache for a later launch without it", async () => {
        fetchMock.mockResolvedValue(respondWith({ defaultServers: ["wss://remote.example"] }));
        await loadService();

        useLocalConfig({ defaultServers: ["ws://localhost:4000"] });
        expect((await loadService()).getConfig().defaultServers).toEqual(["ws://localhost:4000"]);

        process.argv = [originalArgv[0], "app"];
        fetchMock.mockRejectedValue(new Error("offline"));
        const service = await loadService();

        expect(service.getConfig().defaultServers).toEqual(["wss://remote.example"]);
    });

    it("does not ask about a valid file", async () => {
        useLocalConfig({ latestGameVersion: "byar:local" });

        await loadService();

        expect(electronMock.dialog.showMessageBoxSync).not.toHaveBeenCalled();
    });
});

describe("stored config", () => {
    it("falls back to the defaults when config.json is not JSON", async () => {
        fs.writeFileSync(configFile(), "{ not json");
        fetchMock.mockRejectedValue(new Error("offline"));

        const service = await loadService();

        expect(service.getConfig().defaultServers[0]).toBe(Value.Create(configSchema).defaultServers[0]);
        expect(fs.existsSync(`${configFile()}.invalid`)).toBe(true);
    });
});

// The first default is the server for everyone without an override, so a config without one is unusable.
describe("default servers", () => {
    it("ignores a local file with no default servers", async () => {
        useLocalConfig({ defaultServers: [] });
        fetchMock.mockRejectedValue(new Error("offline"));

        const service = await loadService();

        expect(service.getConfig().defaultServers).toEqual(Value.Create(configSchema).defaultServers);
    });

    it("ignores a remote config with no default servers", async () => {
        fetchMock.mockResolvedValue(respondWith({ defaultServers: ["wss://alpha.beyondallreason.info"] }));
        await loadService();

        fetchMock.mockResolvedValue(respondWith({ defaultServers: [] }));
        const service = await loadService();

        expect(service.getConfig().defaultServers).toEqual(["wss://alpha.beyondallreason.info"]);
    });
});
