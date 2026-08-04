// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

const { openPath, openExternal, showItemInFolder, access, handlers } = vi.hoisted(() => ({
    openPath: vi.fn(),
    openExternal: vi.fn(),
    showItemInFolder: vi.fn(),
    access: vi.fn(),
    handlers: new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("fs", () => ({ default: { promises: { access } } }));

vi.mock("electron", () => ({
    shell: { openPath, openExternal, showItemInFolder },
    // typed-ipc reads both off the electron module at import time.
    ipcRenderer: {},
    ipcMain: {
        handle: (channel: string, listener: (event: unknown, ...args: unknown[]) => Promise<unknown>) => handlers.set(channel, listener),
    },
}));

// app.ts calls app.setPath and mkdirSync at module scope, so it can't be imported in a test.
vi.mock("@main/config/app", () => ({
    STATE_PATH: "/state",
    CONFIG_PATH: "/state/config",
    WRITE_DATA_PATH: "/state/write",
    REPLAYS_PATH: "/state/replays",
    getAssetsPath: () => "/assets",
}));
vi.mock("@main/services/config.service", () => {
    return {
        configService: {
            getConfig: vi.fn(() => ({ allowedUrlLinks: ["https://bar-rts.com/replays", "https://www.beyondallreason.info/news"] })),
        },
    };
});
const { shellService } = await import("@main/services/shell.service");

shellService.registerIpcHandlers();

function invoke(channel: string, ...args: unknown[]) {
    const handler = handlers.get(channel);
    if (!handler) throw new Error(`No handler registered for ${channel}`);

    return handler({}, ...args);
}

describe("shellService", () => {
    beforeEach(() => {
        openPath.mockReset();
        openExternal.mockReset();
        showItemInFolder.mockReset();
        access.mockReset();
        access.mockResolvedValue(undefined);
    });

    it("reports success when the path opens", async () => {
        openPath.mockResolvedValue("");

        await expect(invoke("shell:openReplaysDir")).resolves.toEqual({ status: "success", data: undefined });
    });

    // openPath resolves with an error message rather than rejecting, which is the case #507 hit.
    it("turns the error message openPath resolves with into a failed result", async () => {
        openPath.mockResolvedValue("No application found to open file of type inode/directory");

        await expect(invoke("shell:openReplaysDir")).resolves.toEqual({
            status: "failed",
            reason: "open_failed",
            details: "No application found to open file of type inode/directory",
        });
    });

    it("does not let a rejection escape to the renderer", async () => {
        openPath.mockRejectedValue(new Error("reply was never sent"));

        await expect(invoke("shell:openReplaysDir")).resolves.toEqual({
            status: "failed",
            reason: "open_failed",
            details: "reply was never sent",
        });
    });

    it("does not let a synchronous throw escape to the renderer", async () => {
        showItemInFolder.mockImplementation(() => {
            throw new Error("no file manager");
        });

        await expect(invoke("shell:showReplayInFolder", "game.sdfz")).resolves.toEqual({
            status: "failed",
            reason: "open_failed",
            details: "no file manager",
        });
    });

    // showItemInFolder reports nothing, so without the existence check a missing replay looks fine.
    it("reports a missing replay rather than silently doing nothing", async () => {
        access.mockRejectedValue(new Error("ENOENT: no such file or directory"));

        await expect(invoke("shell:showReplayInFolder", "gone.sdfz")).resolves.toMatchObject({ status: "failed", reason: "open_failed" });
        expect(showItemInFolder).not.toHaveBeenCalled();
    });

    it("refuses a url outside the allowed services without calling out", async () => {
        await expect(invoke("shell:openInBrowser", "https://example.com/evil")).resolves.toMatchObject({ status: "failed", reason: "url_not_allowed" });
        expect(openExternal).not.toHaveBeenCalled();
    });

    // new URL throws on anything without a scheme, which used to escape as an IPC rejection.
    it("refuses a malformed url without throwing", async () => {
        await expect(invoke("shell:openInBrowser", "bar-rts.com/replays")).resolves.toMatchObject({ status: "failed", reason: "url_not_allowed" });
        expect(openExternal).not.toHaveBeenCalled();
    });

    it("opens an allowed url", async () => {
        openExternal.mockResolvedValue(undefined);

        await expect(invoke("shell:openInBrowser", "https://bar-rts.com/replays")).resolves.toEqual({ status: "success", data: undefined });
        expect(openExternal).toHaveBeenCalledWith("https://bar-rts.com/replays");
    });
});
