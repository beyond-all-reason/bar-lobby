// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const store = vi.hoisted(() => ({ dir: "" }));
const config = vi.hoisted(() => ({
    current: {} as { defaultServers: string[]; alphaTest?: { id: string; serverUrl: string; messageKey: string } },
}));

vi.mock("@main/config/app", () => ({ CONFIG_PATH: store.dir }));
vi.mock("@main/config/window", () => ({ UI_SCALE_MIN: 0.5, UI_SCALE_MAX: 3 }));
vi.mock("@main/typed-ipc", () => ({ ipcMain: { handle: vi.fn() } }));
vi.mock("@main/services/config.service", () => ({ configService: { getConfig: () => config.current } }));

const SERVER4 = "wss://server4.beyondallreason.info";
const TEST_SERVER = "wss://integration.example";
const settingsFile = () => path.join(store.dir, "settings.json");

async function loadService() {
    vi.resetModules();
    const { settingsService } = await import("@main/services/settings.service");
    await settingsService.init();

    return settingsService;
}

beforeAll(() => {
    store.dir = fs.mkdtempSync(path.join(os.tmpdir(), "bar-settings-"));
});

afterAll(() => {
    fs.rmSync(store.dir, { recursive: true, force: true });
});

beforeEach(() => {
    fs.rmSync(settingsFile(), { force: true });
    config.current = { defaultServers: [SERVER4] };
});

describe("settings startup with an alpha test", () => {
    it("does not report a change for a fresh install picking the default server", async () => {
        const service = await loadService();

        expect(service.getSettings().lobbyServer).toBe(SERVER4);
        expect(service.didLobbyServerChangeOnInit()).toBe(false);
    });

    it("does not report a change while the user has not answered", async () => {
        await loadService();
        config.current = { defaultServers: [SERVER4], alphaTest: { id: "mm-1", serverUrl: TEST_SERVER, messageKey: "rankedMatchmakingTest" } };

        const service = await loadService();

        expect(service.getSettings().lobbyServer).toBe(SERVER4);
        expect(service.didLobbyServerChangeOnInit()).toBe(false);
    });

    it("switches to the test server for a remembered join and reports it", async () => {
        config.current = { defaultServers: [SERVER4], alphaTest: { id: "mm-1", serverUrl: TEST_SERVER, messageKey: "rankedMatchmakingTest" } };
        const first = await loadService();
        await first.updateSettings({ alphaTestChoice: "join" } as never);

        const service = await loadService();

        expect(service.getSettings().lobbyServer).toBe(TEST_SERVER);
        expect(service.didLobbyServerChangeOnInit()).toBe(true);
    });

    it("switches back and reports it once the test ends", async () => {
        config.current = { defaultServers: [SERVER4], alphaTest: { id: "mm-1", serverUrl: TEST_SERVER, messageKey: "rankedMatchmakingTest" } };
        const first = await loadService();
        await first.updateSettings({ alphaTestChoice: "join" } as never);
        await loadService();

        config.current = { defaultServers: [SERVER4] };
        const service = await loadService();

        expect(service.getSettings().lobbyServer).toBe(SERVER4);
        expect(service.getSettings().alphaTestChoice).toBe("ask");
        expect(service.didLobbyServerChangeOnInit()).toBe(true);
    });
});
