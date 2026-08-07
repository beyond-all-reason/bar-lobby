// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from "vitest";

const settings = vi.hoisted(() => ({ devMode: true, loginAutomatically: true }));

vi.mock("@renderer/store/settings.store", () => ({ settingsStore: settings }));

vi.mock("@renderer/store/users.store", () => ({
    subsManager: {
        attach: vi.fn(),
        detach: vi.fn(),
        clearAllFromList: vi.fn(),
    },
}));

let onAuthChanged: ((state: { authenticated: boolean; reason?: string }) => void) | undefined;

const authApi = {
    login: vi.fn(),
    logout: vi.fn(),
    hasCredentials: vi.fn(),
    getState: vi.fn(),
    getIdentity: vi.fn(),
    onChanged: vi.fn((callback: (state: { authenticated: boolean; reason?: string }) => void) => {
        onAuthChanged = callback;
    }),
};

const emptyFriendList = { data: { friends: [], outgoingPendingRequests: [], incomingPendingRequests: [] } };

beforeEach(() => {
    vi.clearAllMocks();
    onAuthChanged = undefined;
    settings.devMode = true;
    settings.loginAutomatically = true;

    authApi.getState.mockResolvedValue({ authenticated: false });
    authApi.hasCredentials.mockResolvedValue(false);
    authApi.logout.mockResolvedValue(undefined);
    authApi.getIdentity.mockResolvedValue(undefined);

    Object.defineProperty(window, "auth", { value: authApi, writable: true, configurable: true });
    Object.assign(window.tachyon as any, {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        request: vi.fn().mockResolvedValue(emptyFriendList),
        onConnected: vi.fn(),
        onDisconnected: vi.fn(),
    });
});

async function loadStore() {
    vi.resetModules();

    return import("@renderer/store/me.store");
}

describe("renderer auth projection", () => {
    it("seeds from the main process rather than assuming signed out", async () => {
        authApi.getState.mockResolvedValue({ authenticated: true });

        const { me, initMeStore } = await loadStore();
        await initMeStore();

        expect(me.isAuthenticated).toBe(true);
    });

    // Identity comes off the durable side, so it is there before any socket is.
    it("shows who the stored credentials belong to while offline", async () => {
        authApi.getIdentity.mockResolvedValue({ userId: "42", username: "Cached", displayName: "Cached", countryCode: "" });
        authApi.getState.mockResolvedValue({ authenticated: false });

        const { me, initMeStore } = await loadStore();
        await initMeStore();

        expect(me.username).toBe("Cached");
        expect(me.userId).toBe("42");
        expect(me.isAuthenticated).toBe(false);
    });

    it("falls back to the defaults when nothing is stored yet", async () => {
        const { me, initMeStore } = await loadStore();
        await initMeStore();

        expect(me.username).toBe("Player");
        expect(me.userId).toBe("0");
    });

    it("follows a session loss the renderer did not ask for", async () => {
        authApi.getState.mockResolvedValue({ authenticated: true });

        const { me, initMeStore } = await loadStore();
        await initMeStore();

        onAuthChanged?.({ authenticated: false, reason: "expired" });

        expect(me.isAuthenticated).toBe(false);
    });

    it("restores without a browser and opens the socket", async () => {
        // A cold start has no session yet, so signing in has to happen before
        // the socket, and without a browser.
        const session = { authenticated: false };
        authApi.hasCredentials.mockResolvedValue(true);
        authApi.getState.mockImplementation(async () => ({ authenticated: session.authenticated }));
        authApi.login.mockImplementation(async () => void (session.authenticated = true));

        const { me, initMeStore } = await loadStore();
        await initMeStore();

        expect(authApi.login).toHaveBeenCalledWith(false);
        expect(window.tachyon.connect).toHaveBeenCalled();
        expect(me.isAuthenticated).toBe(true);
    });

    it("does not touch the session outside dev mode", async () => {
        settings.devMode = false;
        authApi.hasCredentials.mockResolvedValue(true);

        const { initMeStore } = await loadStore();
        await initMeStore();

        expect(authApi.login).not.toHaveBeenCalled();
        expect(window.tachyon.connect).not.toHaveBeenCalled();
    });

    it("honours the automatic login setting", async () => {
        settings.loginAutomatically = false;
        authApi.hasCredentials.mockResolvedValue(true);

        const { initMeStore } = await loadStore();
        await initMeStore();

        expect(authApi.login).not.toHaveBeenCalled();
    });

    // A valid token plus a refused socket is a ban, or a protocol version the
    // server no longer speaks. Nothing retries, so the session has to end.
    it("signs out when the socket refuses the connection", async () => {
        const session = { authenticated: true };
        authApi.hasCredentials.mockResolvedValue(true);
        authApi.getState.mockImplementation(async () => ({ authenticated: session.authenticated }));
        authApi.logout.mockImplementation(async () => void (session.authenticated = false));
        (window.tachyon.connect as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("unauthorized_client"));

        const { me, initMeStore } = await loadStore();
        await initMeStore();

        expect(authApi.logout).toHaveBeenCalled();
        expect(me.isAuthenticated).toBe(false);
    });

    // Going online has to run through the tachyon store rather than reach past it
    // to the socket, because that store is the only thing that records a failed
    // attempt, and its record is what the server status shows.
    it("records a refused connection where the status can show it", async () => {
        authApi.hasCredentials.mockResolvedValue(false);
        authApi.getState.mockResolvedValue({ authenticated: true });

        const { auth, initMeStore } = await loadStore();
        const { tachyonStore } = await import("@renderer/store/tachyon.store");
        await initMeStore();

        (window.tachyon.connect as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("unauthorized_client"));
        await expect(auth.goOnline()).rejects.toThrow();

        expect(tachyonStore.error).toBeDefined();
    });

    it("stays offline when the stored credentials are refused", async () => {
        authApi.hasCredentials.mockResolvedValue(true);
        authApi.login.mockRejectedValue(new Error("invalid_grant"));

        const { me, initMeStore } = await loadStore();
        await initMeStore();

        expect(me.isAuthenticated).toBe(false);
        expect(window.tachyon.connect).not.toHaveBeenCalled();
        expect(me.isInitialized).toBe(true);
    });
});
