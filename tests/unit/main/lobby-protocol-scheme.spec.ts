// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { buildLobbyProtocolUrl, buildLobbyShareableUrl } from "@main/lobbyProtocol/scheme";

describe("lobby protocol url builders", () => {
    it("builds protocol urls", () => {
        expect(buildLobbyProtocolUrl("internal", "ping").href).toBe("barrts://internal/ping");
        expect(buildLobbyProtocolUrl("internal", "ping", { id: "555" }).href).toBe("barrts://internal/ping?id=555");
    });

    it("encodes params", () => {
        expect(buildLobbyProtocolUrl("internal", "maps", { mapName: "Acidic Quarry 5.17" }).searchParams.get("mapName")).toBe("Acidic Quarry 5.17");
    });

    it("builds shareable urls", () => {
        expect(buildLobbyShareableUrl("internal", "ping", { id: "555" }).href).toBe("https://bar.devopsowy.pl/internal/ping?id=555");
    });
});
