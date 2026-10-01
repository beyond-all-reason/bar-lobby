// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";

vi.mock("@renderer/store/db", () => ({
    db: { users: { where: () => ({ first: async () => undefined, modify: async () => undefined }), put: vi.fn() } },
}));
vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));
// The real store is readonly, and these tests need to say when config arrives.
vi.mock("@renderer/store/config.store", async () => {
    const { reactive } = await import("vue");
    return { configStore: reactive({ isInitialized: false, defaultServers: [] as string[] }) };
});

const DEFAULT_SERVER = "wss://server4.beyondallreason.info";
const OTHER_SERVER = "wss://lobby-server-dev.beyondallreason.dev";

const disconnect = vi.fn(async () => {});
const onConnected = vi.fn(async () => {});

const session = { authenticated: true };
const logout = vi.fn(async () => void (session.authenticated = false));

Object.assign(window.tachyon, { disconnect, onConnected });
Object.defineProperty(window, "auth", {
    value: {
        logout,
        getState: vi.fn(async () => ({ authenticated: session.authenticated })),
        getIdentity: vi.fn(async () => undefined),
        hasCredentials: vi.fn(async () => false),
        login: vi.fn(async () => {}),
        onChanged: vi.fn(),
    },
    writable: true,
});

const { me, initMeStore } = await import("@renderer/store/me.store");
const { settingsStore } = await import("@renderer/store/settings.store");
const { tachyonStore } = await import("@renderer/store/tachyon.store");
const configStore = (await import("@renderer/store/config.store")).configStore as { isInitialized: boolean; defaultServers: readonly string[] };

// The watcher does not await the switch, and the session state it ends with is
// read back from main at the end of that chain rather than assigned up front.
async function settle() {
    await nextTick();
    await flushPromises();
}

async function changeServerTo(server: string) {
    settingsStore.lobbyServerOverride = server;
    await settle();
}

describe("switching the active server", () => {
    // Registers the watcher, and there is no guard against doing it twice, so
    // calling it per test would stack one watcher per case.
    beforeAll(async () => {
        await initMeStore();
    });

    beforeEach(async () => {
        disconnect.mockClear();
        logout.mockClear();
        session.authenticated = true;
        settingsStore.isInitialized = false;
        settingsStore.lobbyServerOverride = "";
        configStore.isInitialized = false;
        configStore.defaultServers = [];
        await nextTick();
    });

    // Settings and config load in parallel with the store that watches them, so
    // the stored override or the default arriving is a change as far as the
    // watcher is concerned. Acting on it would sign out everyone not on the
    // default server, every launch.
    it("ignores the stored override arriving while settings are still loading", async () => {
        me.isAuthenticated = true;
        configStore.isInitialized = true;

        await changeServerTo(OTHER_SERVER);

        expect(logout).not.toHaveBeenCalled();
        expect(disconnect).not.toHaveBeenCalled();
        expect(me.isAuthenticated).toBe(true);
    });

    it("ignores the default arriving while config is still loading", async () => {
        me.isAuthenticated = true;
        settingsStore.isInitialized = true;

        configStore.defaultServers = [DEFAULT_SERVER];
        await settle();

        expect(logout).not.toHaveBeenCalled();
        expect(me.isAuthenticated).toBe(true);
    });

    describe("once settings and config are loaded", () => {
        beforeEach(async () => {
            configStore.defaultServers = [DEFAULT_SERVER];
            await nextTick();
            settingsStore.isInitialized = true;
            configStore.isInitialized = true;
            me.isAuthenticated = true;
            tachyonStore.wantsConnection = true;
        });

        // The same setting picks the authorization server, so the tokens we hold
        // were issued somewhere that has no say over the server being joined.
        it("throws the credentials away rather than carrying them over", async () => {
            await changeServerTo("wss://lobby-server-dev.beyondallreason.dev");

            expect(logout).toHaveBeenCalledOnce();
            expect(me.isAuthenticated).toBe(false);
        });

        it("closes the connection to the server being left", async () => {
            await changeServerTo("wss://lobby-server-dev.beyondallreason.dev");

            expect(disconnect).toHaveBeenCalledOnce();
        });

        // A close that still looks wanted gets a reconnect timer, which would then
        // keep firing at credentials that are already gone.
        it("has given up wanting a connection before the socket closes", async () => {
            let wantedWhenClosing: boolean | undefined;
            disconnect.mockImplementationOnce(async () => {
                wantedWhenClosing = tachyonStore.wantsConnection;
            });

            await changeServerTo("wss://lobby-server-dev.beyondallreason.dev");

            expect(wantedWhenClosing).toBe(false);
        });

        // Pinning the default by name doesn't move the client anywhere.
        it("does nothing when the default is picked by name", async () => {
            await changeServerTo(DEFAULT_SERVER);

            expect(logout).not.toHaveBeenCalled();
            expect(disconnect).not.toHaveBeenCalled();
        });

        it("does nothing when an override naming the default is cleared", async () => {
            await changeServerTo(DEFAULT_SERVER);
            await changeServerTo("");

            expect(logout).not.toHaveBeenCalled();
        });

        it("signs out when clearing an override moves back to the default", async () => {
            await changeServerTo(OTHER_SERVER);
            logout.mockClear();
            session.authenticated = true;
            me.isAuthenticated = true;

            await changeServerTo("");

            expect(logout).toHaveBeenCalledOnce();
        });
    });
});
