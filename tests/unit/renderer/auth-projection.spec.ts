// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from "vitest";

const settings = vi.hoisted(() => ({ devMode: true, loginAutomatically: true }));

vi.mock("@renderer/store/settings.store", () => ({ settingsStore: settings }));
vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));

vi.mock("@renderer/store/users.store", () => ({
    subsManager: {
        attach: vi.fn(),
        detach: vi.fn(),
        clearAllFromList: vi.fn(),
        onNewUsersAttached: { add: vi.fn() },
        onOldUsersDetached: { add: vi.fn() },
    },
}));

let onAuthChanged: ((state: { authenticated: boolean; reason?: string }) => void) | undefined;

const windowAuth = {
    login: vi.fn(),
    logout: vi.fn(),
    hasCredentials: vi.fn(),
    getState: vi.fn(),
    getIdentity: vi.fn(),
    onChanged: vi.fn((callback: (state: { authenticated: boolean; reason?: string }) => void) => {
        onAuthChanged = callback;
    }),
};

const emptyFriendList = { status: "success", data: { friends: [], outgoingPendingRequests: [], incomingPendingRequests: [] } };

beforeEach(() => {
    vi.clearAllMocks();
    onAuthChanged = undefined;
    settings.devMode = true;
    settings.loginAutomatically = true;

    windowAuth.getState.mockResolvedValue({ authenticated: false });
    windowAuth.hasCredentials.mockResolvedValue(false);
    windowAuth.logout.mockResolvedValue(undefined);
    windowAuth.getIdentity.mockResolvedValue(undefined);

    Object.defineProperty(window, "auth", { value: windowAuth, writable: true, configurable: true });
    Object.assign(window.tachyon as any, {
        isConnected: vi.fn().mockResolvedValue(false),
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        requestStructured: vi.fn().mockResolvedValue(emptyFriendList),
        onConnected: vi.fn(),
        onDisconnected: vi.fn(),
    });
});

async function loadStores() {
    vi.resetModules();

    const { me, initMeStore } = await import("@renderer/store/me.store");
    const { connectionStore } = await import("@renderer/store/connection.store");
    const { connectionLogic, initConnectionLogic } = await import("@renderer/logic/connection");

    async function start() {
        await initConnectionLogic();
        await initMeStore();
        await connectionLogic.restoreSession();
    }

    return { me, connectionStore, connectionLogic, start };
}

describe("renderer auth projection", () => {
    it("seeds from the main process rather than assuming signed out", async () => {
        windowAuth.getState.mockResolvedValue({ authenticated: true });

        const { connectionStore, start } = await loadStores();
        await start();

        expect(connectionStore.isAuthenticated).toBe(true);
    });

    // Identity comes off the durable side, so it is there before any socket is.
    it("shows who the stored credentials belong to while offline", async () => {
        windowAuth.getIdentity.mockResolvedValue({ userId: "42", username: "Cached", displayName: "Cached", countryCode: "" });
        windowAuth.getState.mockResolvedValue({ authenticated: false });

        const { me, connectionStore, start } = await loadStores();
        await start();

        expect(me.username).toBe("Cached");
        expect(me.userId).toBe("42");
        expect(connectionStore.isAuthenticated).toBe(false);
    });

    it("falls back to the defaults when nothing is stored yet", async () => {
        const { me, start } = await loadStores();
        await start();

        expect(me.username).toBe("Player");
        expect(me.userId).toBe("0");
    });

    it("follows a session loss the renderer did not ask for", async () => {
        windowAuth.getState.mockResolvedValue({ authenticated: true });

        const { connectionStore, start } = await loadStores();
        await start();

        onAuthChanged?.({ authenticated: false, reason: "expired" });

        expect(connectionStore.isAuthenticated).toBe(false);
    });

    it("restores without a browser and opens the socket", async () => {
        // A cold start has no session yet, so signing in has to happen before
        // the socket, and without a browser.
        const session = { authenticated: false };
        windowAuth.hasCredentials.mockResolvedValue(true);
        windowAuth.getState.mockImplementation(async () => ({ authenticated: session.authenticated }));
        windowAuth.login.mockImplementation(async () => void (session.authenticated = true));

        const { connectionStore, start } = await loadStores();
        await start();

        expect(windowAuth.login).toHaveBeenCalledWith(false);
        expect(window.tachyon.connect).toHaveBeenCalled();
        expect(connectionStore.isAuthenticated).toBe(true);
    });

    it("does not touch the session outside dev mode", async () => {
        settings.devMode = false;
        windowAuth.hasCredentials.mockResolvedValue(true);

        const { start } = await loadStores();
        await start();

        expect(windowAuth.login).not.toHaveBeenCalled();
        expect(window.tachyon.connect).not.toHaveBeenCalled();
    });

    it("honours the automatic login setting", async () => {
        settings.loginAutomatically = false;
        windowAuth.hasCredentials.mockResolvedValue(true);

        const { start } = await loadStores();
        await start();

        expect(windowAuth.login).not.toHaveBeenCalled();
    });

    // Only main can tell a rejected refresh token from an unreachable server, and
    // it already destroys the account in the first case. Signing out from here too
    // threw away working credentials whenever the network was slower than the app.
    it("keeps the credentials when the socket refuses the connection", async () => {
        windowAuth.hasCredentials.mockResolvedValue(true);
        windowAuth.getState.mockResolvedValue({ authenticated: true });
        (window.tachyon.connect as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("unauthorized_client"));

        const { connectionStore, start } = await loadStores();
        await expect(start()).resolves.toBeUndefined();

        expect(windowAuth.logout).not.toHaveBeenCalled();
        expect(connectionStore.isAuthenticated).toBe(true);
    });

    // A laptop that woke up before its wifi did. Main keeps the session for a
    // transient failure, so nothing here may throw it away either.
    it("keeps the credentials when the network is not up yet", async () => {
        windowAuth.hasCredentials.mockResolvedValue(true);
        windowAuth.getState.mockResolvedValue({ authenticated: true });
        windowAuth.login.mockRejectedValue(new Error("network"));

        const { start } = await loadStores();
        await expect(start()).resolves.toBeUndefined();

        expect(windowAuth.logout).not.toHaveBeenCalled();
    });

    // Going online has to run through connect(), the only thing that records a
    // failed attempt, which is what the server status shows.
    it("records a refused connection where the status can show it", async () => {
        windowAuth.hasCredentials.mockResolvedValue(false);
        windowAuth.getState.mockResolvedValue({ authenticated: true });

        const { connectionStore, connectionLogic, start } = await loadStores();
        await start();

        (window.tachyon.connect as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("unauthorized_client"));
        await expect(connectionLogic.goOnline()).rejects.toThrow();

        expect(connectionStore.error).toBeDefined();
    });

    it("stays offline when the stored credentials are refused", async () => {
        windowAuth.hasCredentials.mockResolvedValue(true);
        windowAuth.login.mockRejectedValue(new Error("invalid_grant"));

        const { connectionStore, start } = await loadStores();
        await expect(start()).resolves.toBeUndefined();

        expect(connectionStore.isAuthenticated).toBe(false);
        expect(window.tachyon.connect).not.toHaveBeenCalled();
    });
});

// The sign-in screen shows the message of whatever login() or connect() throws.
describe("failure text the sign-in screen shows", () => {
    it("is the login error main sent back", async () => {
        const fromMain = new Error("Error invoking remote method 'auth:login': Error: invalid_grant");
        windowAuth.login.mockRejectedValue(fromMain);
        const { connectionLogic, start } = await loadStores();
        await start();

        await expect(connectionLogic.login()).rejects.toBe(fromMain);
    });

    it("is the connect error main sent back", async () => {
        windowAuth.getState.mockResolvedValue({ authenticated: true });
        const { connectionLogic, start } = await loadStores();
        await start();
        (window.tachyon.connect as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Error invoking remote method 'tachyon:connect': Error: refused"));

        await expect(connectionLogic.connect()).rejects.toThrow(/^Error invoking remote method 'tachyon:connect': Error: refused$/);
    });

    // Nothing shows this one but the fatal error screen, which prints the stack.
    it("is the logout error main sent back", async () => {
        const fromMain = new Error("Error invoking remote method 'auth:logout': Error: wipe failed");
        windowAuth.logout.mockRejectedValue(fromMain);
        const { connectionLogic, start } = await loadStores();
        await start();

        await expect(connectionLogic.logout()).rejects.toBe(fromMain);
    });
});
