// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { linkifyLobbyProtocolUrls, resolveLobbyProtocolLabel } from "@renderer/utils/lobby-protocol-links";

const labels = { "internal/maps": "Go to Map {mapName}", "internal/ping": "Ping" };

describe("lobby protocol links", () => {
    it("uses the label template and falls back to the raw url", () => {
        expect(linkifyLobbyProtocolUrls("see barrts://internal/ping", "barrts", labels)).toBe("see [Ping](barrts://internal/ping)");
        expect(linkifyLobbyProtocolUrls("barrts://internal/unknown", "barrts", labels)).toBe("[barrts://internal/unknown](barrts://internal/unknown)");
    });

    it("does not re-linkify urls already inside markdown links", () => {
        const text = "[x](barrts://internal/ping)";
        expect(linkifyLobbyProtocolUrls(text, "barrts", labels)).toBe(text);
    });

    it("escapes markdown in param values so they cannot break out of the link text", () => {
        const label = resolveLobbyProtocolLabel("barrts://internal/maps?mapName=%5D(https://evil.com)%5B", labels)!;
        expect(label).toBe("Go to Map \\]\\(https://evil\\.com\\)\\[");
        expect(label.replace(/\\./g, "")).not.toMatch(/[()[\]]/);
    });

    it("flattens newlines in param values", () => {
        expect(resolveLobbyProtocolLabel("barrts://internal/maps?mapName=a%0Ab", labels)).toBe("Go to Map a b");
    });
});
