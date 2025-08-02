// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Main Process Lifecycle", () => {
    let mockApp: any;
    let mockProcess: any;
    let mockProtocol: any;
    let mockSession: any;
    let mockNet: any;

    // Mock all services
    const mockServices = {
        engineService: { init: vi.fn().mockResolvedValue(undefined), registerIpcHandlers: vi.fn() },
        settingsService: { init: vi.fn().mockResolvedValue(undefined), registerIpcHandlers: vi.fn() },
        accountService: { init: vi.fn().mockResolvedValue(undefined) },
        replaysService: { init: vi.fn().mockResolvedValue(undefined), registerIpcHandlers: vi.fn() },
        gameService: { init: vi.fn().mockResolvedValue(undefined), registerIpcHandlers: vi.fn() },
        mapsService: { init: vi.fn().mockResolvedValue(undefined), registerIpcHandlers: vi.fn() },
        autoUpdaterService: { init: vi.fn().mockResolvedValue(undefined), registerIpcHandlers: vi.fn() },
        logService: { registerIpcHandlers: vi.fn() },
        infoService: { registerIpcHandlers: vi.fn() },
        authService: { registerIpcHandlers: vi.fn() },
        tachyonService: { registerIpcHandlers: vi.fn() },
        shellService: { registerIpcHandlers: vi.fn() },
        downloadsService: { registerIpcHandlers: vi.fn() },
        miscService: { registerIpcHandlers: vi.fn() },
        navigationService: { registerIpcHandlers: vi.fn() },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();

        mockApp = {
            requestSingleInstanceLock: vi.fn().mockReturnValue(true),
            exit: vi.fn(),
            quit: vi.fn(),
            whenReady: vi.fn().mockResolvedValue(undefined),
            on: vi.fn(),
            setName: vi.fn(),
            enableSandbox: vi.fn(),
            commandLine: {
                appendSwitch: vi.fn(),
            },
        };

        mockProtocol = {
            registerSchemesAsPrivileged: vi.fn(),
            handle: vi.fn(),
        };

        mockSession = {
            defaultSession: {
                webRequest: {
                    onHeadersReceived: vi.fn(),
                },
            },
        };

        mockNet = {
            fetch: vi.fn(),
        };

        mockProcess = {
            env: { NODE_ENV: "development" },
            platform: "linux",
            on: vi.fn(),
            listeners: vi.fn().mockResolvedValue([]),
        };

        vi.doMock("electron", () => ({
            app: mockApp,
            protocol: mockProtocol,
            session: mockSession,
            net: mockNet,
        }));

        vi.doMock("node:net", () => ({
            default: {
                setDefaultAutoSelectFamily: vi.fn(),
            },
        }));

        vi.doMock("@main/main-window", () => ({
            createWindow: vi.fn().mockReturnValue({
                webContents: {},
            }),
        }));

        vi.doMock("@main/typed-ipc", () => ({
            typedWebContents: vi.fn().mockReturnValue({}),
            ipcMain: {
                handle: vi.fn(),
            },
        }));

        vi.doMock("@main/utils/logger", () => ({
            logger: vi.fn().mockReturnValue({
                info: vi.fn(),
                error: vi.fn(),
            }),
        }));

        vi.doMock("@main/config/app", () => ({
            APP_NAME: "Test App",
            SCENARIO_IMAGE_PATH: "/test/path",
        }));

        // Mock all services
        vi.doMock("@main/services/settings.service", () => ({ settingsService: mockServices.settingsService }));
        vi.doMock("@main/services/info.service", () => ({ infoService: mockServices.infoService }));
        vi.doMock("@main/services/account.service", () => ({ accountService: mockServices.accountService }));
        vi.doMock("@main/services/replays.service", () => ({ default: mockServices.replaysService }));
        vi.doMock("@main/services/game.service", () => ({ default: mockServices.gameService }));
        vi.doMock("@main/services/maps.service", () => ({ default: mockServices.mapsService }));
        vi.doMock("@main/services/engine.service", () => ({ default: mockServices.engineService }));
        vi.doMock("@main/services/auto-updater.service", () => ({ default: mockServices.autoUpdaterService }));
        vi.doMock("@main/services/log.service", () => ({ logService: mockServices.logService }));
        vi.doMock("@main/services/auth.service", () => ({ authService: mockServices.authService }));
        vi.doMock("@main/services/tachyon.service", () => ({ tachyonService: mockServices.tachyonService }));
        vi.doMock("@main/services/shell.service", () => ({ shellService: mockServices.shellService }));
        vi.doMock("@main/services/downloads.service", () => ({ default: mockServices.downloadsService }));
        vi.doMock("@main/services/news.service", () => ({ miscService: mockServices.miscService }));
        vi.doMock("@main/services/navigation.service", () => ({ navigationService: mockServices.navigationService }));

        vi.stubGlobal("process", mockProcess);
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it("should exit if single instance lock is not acquired", async () => {
        mockApp.requestSingleInstanceLock.mockReturnValue(false);

        await import("@main/main");

        expect(mockApp.requestSingleInstanceLock).toHaveBeenCalled();
        expect(mockApp.exit).toHaveBeenCalledWith(0);
    });

    it("should start the app successfully and initialize all services", async () => {
        await import("@main/main");

        expect(mockApp.requestSingleInstanceLock).toHaveBeenCalled();
        expect(mockApp.setName).toHaveBeenCalledWith("Test App");
        expect(mockApp.on).toHaveBeenCalledWith("window-all-closed", expect.any(Function));
        expect(mockApp.enableSandbox).toHaveBeenCalled();
        expect(mockApp.commandLine.appendSwitch).toHaveBeenCalledWith("disable-features", "HardwareMediaKeyHandling,MediaSessionService");
        expect(mockApp.commandLine.appendSwitch).toHaveBeenCalledWith("disable-pinch", "1");
        expect(mockApp.whenReady).toHaveBeenCalled();
    });

    it("should handle graceful exit on SIGTERM for non-Windows platforms", async () => {
        mockProcess.platform = "linux";
        let sigTermHandler: any;
        mockProcess.on.mockImplementation((event: string, handler: any) => {
            if (event === "SIGTERM") {
                sigTermHandler = handler;
            }
        });

        await import("@main/main");

        expect(mockProcess.on).toHaveBeenCalledWith("SIGTERM", expect.any(Function));

        // Simulate SIGTERM
        sigTermHandler();
        expect(mockApp.quit).toHaveBeenCalled();
    });

    it("should handle graceful exit on message for Windows platform", async () => {
        mockProcess.platform = "win32";
        let messageHandler: any;
        mockProcess.on.mockImplementation((event: string, handler: any) => {
            if (event === "message") {
                messageHandler = handler;
            }
        });

        await import("@main/main");

        expect(mockProcess.on).toHaveBeenCalledWith("message", expect.any(Function));

        // Simulate graceful-exit message
        messageHandler("graceful-exit");
        expect(mockApp.quit).toHaveBeenCalled();
    });

    it("should not handle graceful exit in production environment", async () => {
        mockProcess.env.NODE_ENV = "production";

        await import("@main/main");

        expect(mockProcess.on).not.toHaveBeenCalled();
    });

    it("should initialize services when app is ready", async () => {
        await import("@main/main");

        expect(mockServices.engineService.init).toHaveBeenCalled();
        expect(mockServices.settingsService.init).toHaveBeenCalled();
        expect(mockServices.accountService.init).toHaveBeenCalled();
        expect(mockServices.replaysService.init).toHaveBeenCalled();
        expect(mockServices.gameService.init).toHaveBeenCalled();
        expect(mockServices.mapsService.init).toHaveBeenCalled();
        expect(mockServices.autoUpdaterService.init).toHaveBeenCalled();
    });

    it("should register IPC handlers when app is ready", async () => {
        await import("@main/main");

        expect(mockServices.logService.registerIpcHandlers).toHaveBeenCalled();
        expect(mockServices.infoService.registerIpcHandlers).toHaveBeenCalled();
        expect(mockServices.settingsService.registerIpcHandlers).toHaveBeenCalled();
        expect(mockServices.authService.registerIpcHandlers).toHaveBeenCalled();
        expect(mockServices.tachyonService.registerIpcHandlers).toHaveBeenCalled();
        expect(mockServices.replaysService.registerIpcHandlers).toHaveBeenCalled();
        expect(mockServices.engineService.registerIpcHandlers).toHaveBeenCalled();
        expect(mockServices.gameService.registerIpcHandlers).toHaveBeenCalled();
        expect(mockServices.mapsService.registerIpcHandlers).toHaveBeenCalled();
        expect(mockServices.shellService.registerIpcHandlers).toHaveBeenCalled();
        expect(mockServices.downloadsService.registerIpcHandlers).toHaveBeenCalled();
        expect(mockServices.miscService.registerIpcHandlers).toHaveBeenCalled();
        expect(mockServices.autoUpdaterService.registerIpcHandlers).toHaveBeenCalled();
        expect(mockServices.navigationService.registerIpcHandlers).toHaveBeenCalled();
    });
});
