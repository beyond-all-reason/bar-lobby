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

    it("rejects a file with a value of the wrong type", async () => {
        useLocalConfig({ defaultServers: "wss://not-a-list" });

        await expect(loadService()).rejects.toThrow("Provided config file does not match schema");
    });
});

// The first default is the server for everyone without an override, so a config without one is unusable.
describe("default servers", () => {
    it("rejects a local file with no default servers", async () => {
        useLocalConfig({ defaultServers: [] });

        await expect(loadService()).rejects.toThrow("Provided config file does not match schema");
    });

    it("ignores a remote config with no default servers", async () => {
        fetchMock.mockResolvedValue(respondWith({ defaultServers: ["wss://alpha.beyondallreason.info"] }));
        await loadService();

        fetchMock.mockResolvedValue(respondWith({ defaultServers: [] }));
        const service = await loadService();

        expect(service.getConfig().defaultServers).toEqual(["wss://alpha.beyondallreason.info"]);
    });
});
