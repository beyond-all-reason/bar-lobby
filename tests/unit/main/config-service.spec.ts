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

const alphaTest = { id: "mm-1", serverUrl: "wss://integration.example", messageKey: "rankedMatchmakingTest" };

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

describe("remote config", () => {
    it("stores an announced alpha test", async () => {
        fetchMock.mockResolvedValue(respondWith({ alphaTest }));

        const service = await loadService();

        expect(service.getConfig().alphaTest).toEqual(alphaTest);
    });

    it("removes the alpha test once a fetch no longer announces it", async () => {
        fetchMock.mockResolvedValue(respondWith({ alphaTest }));
        const service = await loadService();

        fetchMock.mockResolvedValue(respondWith({}));
        await service.fetchConfig();

        expect(service.getConfig().alphaTest).toBeUndefined();
        expect(JSON.parse(fs.readFileSync(configFile(), "utf-8")).alphaTest).toBeUndefined();
    });

    it("removes a cached alpha test on the next launch's fetch", async () => {
        fetchMock.mockResolvedValue(respondWith({ alphaTest }));
        await loadService();

        fetchMock.mockResolvedValue(respondWith({}));
        const service = await loadService();

        expect(service.getConfig().alphaTest).toBeUndefined();
    });

    it("keeps the cached alpha test when the fetch fails", async () => {
        fetchMock.mockResolvedValue(respondWith({ alphaTest }));
        const service = await loadService();

        fetchMock.mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));
        await service.fetchConfig();

        expect(service.getConfig().alphaTest).toEqual(alphaTest);
    });

    it("accepts a message key this release does not know", async () => {
        const futureTest = { ...alphaTest, messageKey: "tournamentTest", endsAt: "2026-12-01T00:00:00Z" };
        fetchMock.mockResolvedValue(respondWith({ alphaTest: futureTest, latestGameVersion: "byar:remote" }));

        const service = await loadService();

        expect(service.getConfig().alphaTest).toEqual(futureTest);
        expect(service.getConfig().latestGameVersion).toBe("byar:remote");
    });
});

describe("local config", () => {
    it("never fetches the remote config", async () => {
        useLocalConfig({});
        fetchMock.mockResolvedValue(respondWith({ alphaTest }));

        const service = await loadService();
        await service.fetchConfig();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("keeps its own alpha test when the remote has none", async () => {
        const localTest = { ...alphaTest, id: "local-dev" };
        useLocalConfig({ alphaTest: localTest });
        fetchMock.mockResolvedValue(respondWith({}));

        const service = await loadService();
        await service.fetchConfig();

        expect(service.getConfig().alphaTest).toEqual(localTest);
    });

    it("has no alpha test when it leaves one out, even if one was cached", async () => {
        fetchMock.mockResolvedValue(respondWith({ alphaTest }));
        await loadService();

        useLocalConfig({});
        const service = await loadService();

        expect(service.getConfig().alphaTest).toBeUndefined();
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
