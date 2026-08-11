// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

vi.mock("@renderer/store/db", () => ({
    db: { users: { where: () => ({ first: async () => undefined, modify: async () => undefined }), put: vi.fn() } },
}));

const disconnect = vi.fn(async () => {});
const wipe = vi.fn(async () => {});
const onConnected = vi.fn(async () => {});

Object.assign(window.tachyon, { disconnect, onConnected });
Object.defineProperty(window, "auth", {
    value: { wipe, hasCredentials: vi.fn(async () => false), login: vi.fn(async () => {}), logout: vi.fn(async () => {}) },
    writable: true,
});

const { me, initMeStore } = await import("@renderer/store/me.store");
const { settingsStore } = await import("@renderer/store/settings.store");

async function changeServerTo(server: string) {
    settingsStore.lobbyServer = server;
    await nextTick();
}

describe("switching the active server", () => {
    // Registers the watcher, and there is no guard against doing it twice, so
    // calling it per test would stack one watcher per case.
    beforeAll(async () => {
        await initMeStore();
    });

    beforeEach(async () => {
        disconnect.mockClear();
        wipe.mockClear();
        settingsStore.isInitialized = false;
        settingsStore.lobbyServer = "wss://server4.beyondallreason.info";
        await nextTick();
    });

    // Settings load in parallel with the store that watches them, so the stored
    // server arriving over the default is a change as far as the watcher is
    // concerned. Acting on it would sign out everyone not on the default server,
    // every launch.
    it("ignores the stored server arriving while settings are still loading", async () => {
        me.isAuthenticated = true;

        await changeServerTo("wss://lobby-server-dev.beyondallreason.dev");

        expect(wipe).not.toHaveBeenCalled();
        expect(disconnect).not.toHaveBeenCalled();
        expect(me.isAuthenticated).toBe(true);
    });

    describe("once settings are loaded", () => {
        beforeEach(() => {
            settingsStore.isInitialized = true;
            me.isAuthenticated = true;
        });

        // The same setting picks the authorization server, so the tokens we hold
        // were issued somewhere that has no say over the server being joined.
        it("throws the credentials away rather than carrying them over", async () => {
            await changeServerTo("wss://lobby-server-dev.beyondallreason.dev");

            expect(wipe).toHaveBeenCalledOnce();
            expect(me.isAuthenticated).toBe(false);
        });

        it("closes the connection to the server being left", async () => {
            await changeServerTo("wss://lobby-server-dev.beyondallreason.dev");

            expect(disconnect).toHaveBeenCalledOnce();
        });

        // A drop while we still look authenticated gets a reconnect timer, which
        // then keeps firing against credentials that are already gone.
        it("has given up the session before the connection closes", async () => {
            let authenticatedWhenClosing: boolean | undefined;
            disconnect.mockImplementationOnce(async () => {
                authenticatedWhenClosing = me.isAuthenticated;
            });

            await changeServerTo("wss://lobby-server-dev.beyondallreason.dev");

            expect(authenticatedWhenClosing).toBe(false);
        });

        it("does nothing when the same server is picked again", async () => {
            await changeServerTo("wss://server4.beyondallreason.info");

            expect(wipe).not.toHaveBeenCalled();
            expect(disconnect).not.toHaveBeenCalled();
        });
    });
});
