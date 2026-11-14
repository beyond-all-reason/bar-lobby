// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi, beforeEach } from "vitest";

describe("lobby protocol router", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it("extracts lobby protocol urls from argv", async () => {
        const { extractLobbyProtocolUrl } = await import("@main/lobbyProtocol/lobby-protocol-router");

        expect(extractLobbyProtocolUrl(["electron", "barrts://internal/ping"])).toBe("barrts://internal/ping");
        expect(extractLobbyProtocolUrl(["electron", "--some-flag"])).toBeUndefined();
    });

    it("routes registered protocol actions", async () => {
        const { registerLobbyProtocolAction, routeLobbyProtocolUrl } = await import("@main/lobbyProtocol/lobby-protocol-router");
        const handler = vi.fn();
        const webContents = { send: vi.fn() } as never;

        registerLobbyProtocolAction("internal", "ping", handler);
        routeLobbyProtocolUrl("barrts://internal/ping?foo=bar", webContents);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0]).toEqual(new URL("barrts://internal/ping?foo=bar"));
        expect(handler.mock.calls[0][1]).toBe(webContents);
    });
});
