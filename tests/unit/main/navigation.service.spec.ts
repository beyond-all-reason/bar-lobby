// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    existsSync: vi.fn(),
    copyParseReplay: vi.fn().mockResolvedValue(undefined),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
}));

vi.mock("fs", () => ({
    default: { existsSync: mocks.existsSync },
}));

vi.mock("@main/content/replays/replay-content", () => ({
    replayContentAPI: { copyParseReplay: mocks.copyParseReplay },
}));

vi.mock("@main/utils/logger", () => ({
    logger: () => ({ info: mocks.info, warn: mocks.warn, error: mocks.error }),
}));

describe("Navigation service", () => {
    let readyHandler!: () => void;
    let window: {
        isMinimized: ReturnType<typeof vi.fn>;
        restore: ReturnType<typeof vi.fn>;
        focus: ReturnType<typeof vi.fn>;
    };
    let webContents: {
        ipc: { handle: ReturnType<typeof vi.fn> };
        send: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        mocks.existsSync.mockReturnValue(true);
        mocks.copyParseReplay.mockResolvedValue(undefined);

        window = {
            isMinimized: vi.fn().mockReturnValue(false),
            restore: vi.fn(),
            focus: vi.fn(),
        };
        webContents = {
            ipc: {
                handle: vi.fn((_channel, handler) => {
                    readyHandler = handler;
                }),
            },
            send: vi.fn(),
        };
    });

    async function loadService() {
        const { navigationService } = await import("@main/services/navigation.service");
        navigationService.registerIpcHandlers(window as never, webContents as never);
        return navigationService;
    }

    it("queues replay requests until the renderer is ready", async () => {
        const navigationService = await loadService();
        const replay = path.resolve("C:/replays/match.sdfz");

        navigationService.enqueueReplayRequest([replay], "C:/replays");

        expect(mocks.copyParseReplay).not.toHaveBeenCalled();

        readyHandler();

        expect(mocks.copyParseReplay).toHaveBeenCalledWith(replay);
        expect(webContents.send).toHaveBeenCalledWith("navigation:navigateTo", "/watch/replays");
        expect(webContents.send).toHaveBeenCalledWith("replays:highlightOpened", ["match.sdfz"]);
    });

    it("focuses the existing window and accepts uppercase replay extensions", async () => {
        const navigationService = await loadService();
        const replay = path.resolve("C:/replays/match.SDFZ");
        window.isMinimized.mockReturnValue(true);
        readyHandler();

        navigationService.handleSecondInstance([replay], "C:/replays");

        expect(window.restore).toHaveBeenCalled();
        expect(window.focus).toHaveBeenCalled();
        expect(mocks.copyParseReplay).toHaveBeenCalledWith(replay);
    });

    it("deduplicates replay files queued before renderer readiness", async () => {
        const navigationService = await loadService();
        const replay = path.resolve("C:/replays/match.sdfz");

        navigationService.enqueueReplayRequest([replay], "C:/replays");
        navigationService.enqueueReplayRequest([replay], "C:/replays");
        readyHandler();

        expect(mocks.copyParseReplay).toHaveBeenCalledTimes(1);
    });

    it("does not open the same replay concurrently", async () => {
        let finishOpening!: () => void;
        mocks.copyParseReplay.mockReturnValue(
            new Promise<void>((resolve) => {
                finishOpening = resolve;
            })
        );
        const navigationService = await loadService();
        const replay = path.resolve("C:/replays/match.sdfz");
        readyHandler();

        navigationService.enqueueReplayRequest([replay], "C:/replays");
        navigationService.enqueueReplayRequest([replay], "C:/replays");

        expect(mocks.copyParseReplay).toHaveBeenCalledTimes(1);
        finishOpening();
        await Promise.resolve();
    });

    it("notifies the renderer when a requested replay does not exist", async () => {
        const navigationService = await loadService();
        const replay = path.resolve("C:/replays/missing.sdfz");
        mocks.existsSync.mockReturnValue(false);
        readyHandler();

        navigationService.enqueueReplayRequest([replay], "C:/replays");

        expect(mocks.copyParseReplay).not.toHaveBeenCalled();
        expect(webContents.send).toHaveBeenCalledWith("notifications:showAlert", {
            text: "Replay file not found: missing.sdfz",
            severity: "error",
        });
    });
});
