// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { resolveLobbyServer } from "@shared/lobby-server";
import { describe, expect, it } from "vitest";

const defaults = ["wss://server4.beyondallreason.info", "wss://server5.beyondallreason.info"];

describe("resolveLobbyServer", () => {
    it("uses the override when one is set", () => {
        expect(resolveLobbyServer("ws://localhost:4000", defaults)).toBe("ws://localhost:4000");
    });

    it("uses the first default when there is no override", () => {
        expect(resolveLobbyServer("", defaults)).toBe("wss://server4.beyondallreason.info");
    });

    // The point of not storing the default: a new one from config is picked up.
    it("follows a change to the first default", () => {
        expect(resolveLobbyServer("", ["wss://alpha.beyondallreason.info", ...defaults])).toBe("wss://alpha.beyondallreason.info");
    });

    it("keeps an override when the defaults change", () => {
        expect(resolveLobbyServer("wss://server5.beyondallreason.info", ["wss://alpha.beyondallreason.info"])).toBe("wss://server5.beyondallreason.info");
    });
});
