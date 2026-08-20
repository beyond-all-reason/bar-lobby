// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import { beforeEach, describe, it, vi, expect, afterEach } from "vitest";

type MockIpcRenderer = {
    invoke: Function;
    on: Function;
};

describe("Preload API Context Bridge", () => {
    // List of all APIs exposed in the preload script
    const apiNames = ["log", "info", "mainWindow", "shell", "replays", "settings", "auth", "content", "engine", "game", "maps", "misc", "barNavigation", "tachyon", "autoUpdater", "notifications"];

    let mockWindow: any;
    let mockIpcRenderer: MockIpcRenderer;
    let mockExposeInMainWorld: any;

    beforeEach(() => {
        mockWindow = {};

        mockExposeInMainWorld = vi.fn((name, api) => {
            mockWindow[name] = api;
        });

        mockIpcRenderer = {
            invoke: vi.fn(),
            on: vi.fn(),
        };

        vi.doMock("electron", () => ({
            contextBridge: { exposeInMainWorld: mockExposeInMainWorld },
        }));

        vi.doMock("@main/typed-ipc", () => ({
            ipcRenderer: mockIpcRenderer,
        }));

        vi.doMock("@main/replays/replay", () => ({ Replay: {} }));
        vi.doMock("@main/services/settings.service", () => ({ Settings: {} }));
        vi.doMock("@main/content/engine/engine-version", () => ({ EngineVersion: {} }));
        vi.doMock("@main/content/game/game-version", () => ({ GameVersion: {} }));
        vi.doMock("@main/content/maps/map-data", () => ({ MapData: {}, MapDownloadData: {} }));
        vi.doMock("@main/content/downloads", () => ({ DownloadInfo: {} }));
        vi.doMock("@main/services/info.service", () => ({ Info: {} }));
        vi.doMock("@main/game/battle/battle-types", () => ({ BattleWithMetadata: {} }));
        vi.doMock("tachyon-protocol", () => ({
            GetCommandData: {},
            GetCommandIds: () => [],
            GetCommands: () => [],
        }));
        vi.doMock("@main/game/game", () => ({ MultiplayerLaunchSettings: {} }));
        vi.doMock("@main/services/log.service", () => ({ logLevels: {} }));
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it("should expose all APIs in the main world via contextBridge", async () => {
        await import("@preload/preload");

        for (const api of apiNames) {
            expect(mockWindow[api]).toBeDefined();
        }
    });

    it("should expose application logs API", async () => {
        await import("@preload/preload");

        mockWindow.log.purge();
        mockWindow.log.pack();
        mockWindow.log.upload();
        mockWindow.log.log("mock_filename", "debug", "mock message");

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("log:purge");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("log:pack");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("log:upload");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("log:log", "mock_filename", "debug", "mock message");
    });

    it("should expose info API", async () => {
        await import("@preload/preload");

        mockWindow.info.getInfo();

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("info:get");
    });

    it("should expose main window API", async () => {
        await import("@preload/preload");

        mockWindow.mainWindow.setFullscreen(true);
        mockWindow.mainWindow.setSize(42);
        mockWindow.mainWindow.flashFrame(false);
        mockWindow.mainWindow.minimize();
        mockWindow.mainWindow.isFullscreen();
        mockWindow.mainWindow.setUiScale(1.25);

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("mainWindow:setFullscreen", true);
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("mainWindow:setSize", 42);
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("mainWindow:flashFrame", false);
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("mainWindow:minimize");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("mainWindow:isFullscreen");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("mainWindow:setUiScale", 1.25);
    });

    it("should expose shell API", async () => {
        await import("@preload/preload");

        mockWindow.shell.openStateDir();
        mockWindow.shell.openAssetsDir();
        mockWindow.shell.openSettingsFile();
        mockWindow.shell.openStartScript();
        mockWindow.shell.openReplaysDir();
        mockWindow.shell.showReplayInFolder("replay1");
        mockWindow.shell.openInBrowser("https://example.com");

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("shell:openStateDir");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("shell:openAssetsDir");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("shell:openSettingsFile");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("shell:openStartScript");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("shell:openReplaysDir");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("shell:showReplayInFolder", "replay1");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("shell:openInBrowser", "https://example.com");
    });

    it("should expose replays API", async () => {
        await import("@preload/preload");

        mockWindow.replays.sync(["replay1", "replay2"]);
        mockWindow.replays.delete("replay1");

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("replays:sync", ["replay1", "replay2"]);
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("replays:delete", "replay1");
    });

    it("should expose settings API", async () => {
        await import("@preload/preload");

        mockWindow.settings.getSettings();
        mockWindow.settings.updateSettings({ foo: "bar" });
        mockWindow.settings.toggleFullscreen();

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("settings:get");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("settings:update", { foo: "bar" });
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("settings:toggleFullscreen");
    });

    it("should expose auth API", async () => {
        await import("@preload/preload");

        mockWindow.auth.login(false);
        mockWindow.auth.logout();
        mockWindow.auth.hasCredentials();
        mockWindow.auth.getState();
        mockWindow.auth.getIdentity();

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("auth:login", false);
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("auth:identity");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("auth:logout");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("auth:hasCredentials");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("auth:state");
    });

    it("should expose engine API", async () => {
        await import("@preload/preload");

        mockWindow.engine.listAvailableVersions();
        mockWindow.engine.downloadEngine("v1");
        mockWindow.engine.isVersionInstalled("v1");
        mockWindow.engine.uninstallVersion({});

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("engine:listAvailableVersions");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("engine:downloadEngine", "v1");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("engine:isVersionInstalled", "v1");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("engine:uninstallVersion", {});
    });

    it("should expose game API", async () => {
        await import("@preload/preload");

        mockWindow.game.downloadGame("v1");
        mockWindow.game.getScenarios("v1");
        mockWindow.game.getInstalledVersions();
        mockWindow.game.isVersionInstalled("v1");
        mockWindow.game.uninstallVersion("v1");
        mockWindow.game.launchMultiplayer({});
        mockWindow.game.launchScript("script", "gameV", "engineV");

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("game:downloadGame", "v1");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("game:getScenarios", "v1");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("game:getInstalledVersions");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("game:isVersionInstalled", "v1");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("game:uninstallVersion", "v1");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("game:launchMultiplayer", {});
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("game:launchScript", "script", "gameV", "engineV");
    });

    it("should expose maps API", async () => {
        await import("@preload/preload");

        mockWindow.maps.downloadMap("map1");
        mockWindow.maps.downloadMaps(["map1", "map2"]);
        mockWindow.maps.isVersionInstalled("map1");
        mockWindow.maps.fetchAllMaps();
        mockWindow.maps.fetchMapImages("imgsrc");

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("maps:downloadMap", "map1");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("maps:downloadMaps", ["map1", "map2"]);
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("maps:isVersionInstalled", "map1");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("maps:online:fetchAllMaps");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("maps:online:fetchMapImages", "imgsrc");
    });

    it("should expose content API", async () => {
        await import("@preload/preload");

        mockWindow.content.missing([{ type: "map", id: "Quicksilver" }]);
        mockWindow.content.state();
        mockWindow.content.ensure([{ type: "map", id: "Quicksilver" }]);
        mockWindow.content.remove([{ type: "map", id: "Quicksilver" }]);

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("content:missing", [{ type: "map", id: "Quicksilver" }]);
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("content:state");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("content:ensure", [{ type: "map", id: "Quicksilver" }]);
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("content:remove", [{ type: "map", id: "Quicksilver" }]);
        expect(typeof mockWindow.content.onChanged).toBe("function");
        expect(typeof mockWindow.content.onSettled).toBe("function");
    });

    it("should expose misc API", async () => {
        await import("@preload/preload");

        mockWindow.misc.getNewsRssFeed(5);
        mockWindow.misc.getDevlogRssFeed(3);

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("misc:getNewsRssFeed", 5);
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("misc:getDevlogRssFeed", 3);
    });

    it("should expose barNavigation API", async () => {
        await import("@preload/preload");

        mockWindow.barNavigation.signalReady();
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("renderer:ready");
        expect(typeof mockWindow.barNavigation.onNavigateTo).toBe("function");
    });

    it("should expose tachyon API", async () => {
        await import("@preload/preload");

        mockWindow.tachyon.isConnected();
        mockWindow.tachyon.connect();
        mockWindow.tachyon.disconnect();
        mockWindow.tachyon.dropConnection();
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("tachyon:isConnected");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("tachyon:connect");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("tachyon:disconnect");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("tachyon:dropConnection");
        expect(typeof mockWindow.tachyon.request).toBe("function");
        expect(typeof mockWindow.tachyon.requestStructured).toBe("function");
        expect(typeof mockWindow.tachyon.onConnected).toBe("function");
        expect(typeof mockWindow.tachyon.onDisconnected).toBe("function");
        expect(typeof mockWindow.tachyon.onEvent).toBe("function");
        expect(typeof mockWindow.tachyon.onBattleStart).toBe("function");
    });

    it("should expose autoUpdater API", async () => {
        await import("@preload/preload");

        mockWindow.autoUpdater.checkForUpdates();
        mockWindow.autoUpdater.downloadUpdate();
        mockWindow.autoUpdater.quitAndInstall();
        mockWindow.autoUpdater.installUpdates();
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("autoUpdater:checkForUpdates");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("autoUpdater:downloadUpdate");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("autoUpdater:quitAndInstall");
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("autoUpdater:installUpdates");
        expect(typeof mockWindow.autoUpdater.onDownloadUpdateProgress).toBe("function");
    });

    it("should expose notifications API", async () => {
        await import("@preload/preload");
        expect(typeof mockWindow.notifications.onShowAlert).toBe("function");
    });
});
