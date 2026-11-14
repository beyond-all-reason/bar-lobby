// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("internal lobby protocol handlers", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    async function route(url: string) {
        const { routeLobbyProtocolUrl } = await import("@main/lobbyProtocol/lobby-protocol-router");
        await import("@main/lobbyProtocol/handlers/internal.handler");
        const webContents = { send: vi.fn() };
        routeLobbyProtocolUrl(url, webContents as never);
        return webContents.send;
    }

    it("navigates to a map by name", async () => {
        const send = await route("barrts://internal/maps?mapName=Acidic%20Quarry%205.17");
        expect(send).toHaveBeenCalledWith("navigation:navigateTo", "/library/maps/Acidic%20Quarry%205.17");
    });

    it("encodes path separators in map names", async () => {
        const send = await route("barrts://internal/maps?mapName=..%2F..%2Fprofile");
        expect(send).toHaveBeenCalledWith("navigation:navigateTo", "/library/maps/..%2F..%2Fprofile");
    });

    it("falls back to the map list without a usable name", async () => {
        for (const url of ["barrts://internal/maps", "barrts://internal/maps?mapName=%20", `barrts://internal/maps?mapName=${"a".repeat(201)}`]) {
            const send = await route(url);
            expect(send).toHaveBeenCalledWith("navigation:navigateTo", "/library/maps/maps");
        }
    });
});
