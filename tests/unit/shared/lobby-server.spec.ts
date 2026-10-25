// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reconcileCustomServers, resolveLobbyServer } from "@shared/lobby-server";
import { describe, expect, it } from "vitest";

const defaults = ["wss://server4.beyondallreason.info", "wss://server5.beyondallreason.info"];

describe("resolveLobbyServer", () => {
    it("uses the override when one is set", () => {
        expect(resolveLobbyServer(false, "ws://localhost:4000", defaults)).toBe("ws://localhost:4000");
    });

    it("uses the first default when there is no override", () => {
        expect(resolveLobbyServer(false, "", defaults)).toBe("wss://server4.beyondallreason.info");
    });

    it("ignores the override while using the default", () => {
        expect(resolveLobbyServer(true, "ws://localhost:4000", defaults)).toBe("wss://server4.beyondallreason.info");
    });

    // The point of not storing the default: a new one from config is picked up.
    it("follows a change to the first default", () => {
        expect(resolveLobbyServer(true, "", ["wss://alpha.beyondallreason.info", ...defaults])).toBe("wss://alpha.beyondallreason.info");
    });

    it("keeps an override when the defaults change", () => {
        expect(resolveLobbyServer(false, "wss://server5.beyondallreason.info", ["wss://alpha.beyondallreason.info"])).toBe("wss://server5.beyondallreason.info");
    });
});

describe("reconcileCustomServers", () => {
    const local = "ws://localhost:4000";

    it("leaves the lists alone when the defaults are unchanged", () => {
        expect(reconcileCustomServers("", [local], defaults)).toEqual([local]);
        expect(reconcileCustomServers(local, [local], defaults)).toEqual([local]);
        expect(reconcileCustomServers(defaults[1], [local], defaults)).toEqual([local]);
    });

    it("drops a custom server that became a default", () => {
        expect(reconcileCustomServers("", [local, defaults[1]], defaults)).toEqual([local]);
    });

    // The override names it, and it is now offered as a default, so it appears once.
    it("drops a custom server that became a default while it is the override", () => {
        expect(reconcileCustomServers(defaults[1], [local, defaults[1]], defaults)).toEqual([local]);
    });

    it("makes an override a custom server when its default is dropped", () => {
        expect(reconcileCustomServers(defaults[1], [local], [defaults[0]])).toEqual([local, defaults[1]]);
    });

    it("forgets a dropped default that is not the override", () => {
        expect(reconcileCustomServers("", [local], ["wss://alpha.beyondallreason.info"])).toEqual([local]);
    });

    it("handles an entirely new default list with the override on an old default", () => {
        const newDefaults = ["wss://alpha.beyondallreason.info", local];

        expect(reconcileCustomServers(defaults[0], [local, defaults[1]], newDefaults)).toEqual([defaults[1], defaults[0]]);
    });

    it("lists a duplicated custom server once", () => {
        expect(reconcileCustomServers("", [local, local], defaults)).toEqual([local]);
    });
});
