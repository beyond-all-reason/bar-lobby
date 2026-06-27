// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("lobby protocol service", () => {
    let routeSpy: ReturnType<typeof vi.fn>;
    let secondInstanceHandler: any;
    let ipcHandlers: Record<string, any>;
    let webContents: {
        ipc: {
            handle: (channel: string, handler: any) => void;
        };
    };
    let processStub!: {
        argv: string[];
        env: Record<string, string>;
        platform: string;
    };

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();

        routeSpy = vi.fn();
        secondInstanceHandler = undefined;
        ipcHandlers = {};
        webContents = {
            ipc: {
                handle: (channel: string, handler: any) => {
                    ipcHandlers[channel] = handler;
                },
            },
        };

        vi.doMock("electron", () => ({
            app: {
                on: vi.fn((event: string, handler: any) => {
                    if (event === "second-instance") {
                        secondInstanceHandler = handler;
                    }
                }),
            },
        }));

        vi.doMock("@main/lobbyProtocol", () => ({
            extractLobbyProtocolUrl: (argv: string[]) => argv.find((arg) => arg.startsWith("barrts://")),
            getLobbyProtocolLabels: vi.fn().mockReturnValue({}),
            routeLobbyProtocolUrl: routeSpy,
        }));

        vi.doMock("@main/utils/logger", () => ({
            logger: vi.fn().mockReturnValue({
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            }),
        }));

        processStub = {
            argv: ["electron", "."],
            env: { NODE_ENV: "development" },
            platform: "linux",
        };
        vi.stubGlobal("process", processStub as never);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("queues urls until the renderer becomes ready", async () => {
        const { lobbyProtocolService } = await import("@main/services/lobby-protocol.service");

        processStub.argv = ["electron", "barrts://internal/startup"];
        lobbyProtocolService.registerIpcHandlers(webContents as never);

        expect(routeSpy).not.toHaveBeenCalled();

        secondInstanceHandler?.("event", ["electron", "barrts://internal/ping"]);
        expect(routeSpy).not.toHaveBeenCalled();

        ipcHandlers["lobbyProtocol:handlePending"]();

        expect(routeSpy).toHaveBeenNthCalledWith(1, "barrts://internal/startup", webContents);
        expect(routeSpy).toHaveBeenNthCalledWith(2, "barrts://internal/ping", webContents);

        secondInstanceHandler?.("event", ["electron", "barrts://internal/replays"]);
        expect(routeSpy).toHaveBeenNthCalledWith(3, "barrts://internal/replays", webContents);
    });
});
