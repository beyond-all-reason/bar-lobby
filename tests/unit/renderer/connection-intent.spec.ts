// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));

vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));

const connectHandlers: Array<() => void> = [];
const disconnectHandlers: Array<() => void> = [];
const authHandlers: Array<(state: { authenticated: boolean }) => void> = [];

const connect = vi.fn(async () => {});
const disconnect = vi.fn(async () => {});

Object.assign(window.tachyon, {
    isConnected: vi.fn(async () => false),
    connect,
    disconnect,
    request: vi.fn(async () => ({ data: {} })),
    onConnected: (callback: () => void) => void connectHandlers.push(callback),
    onDisconnected: (callback: () => void) => void disconnectHandlers.push(callback),
    onBattleStart: vi.fn(),
});

Object.defineProperty(window, "auth", {
    value: { onChanged: (callback: (state: { authenticated: boolean }) => void) => void authHandlers.push(callback) },
    writable: true,
});

const { tachyonStore, tachyon, initTachyonStore } = await import("@renderer/store/tachyon.store");
const { me } = await import("@renderer/store/me.store");

const simulateConnect = () => connectHandlers.forEach((handler) => handler());
const simulateClose = () => disconnectHandlers.forEach((handler) => handler());
const simulateSessionEnd = () => authHandlers.forEach((handler) => handler({ authenticated: false }));

describe("connection intent", () => {
    beforeAll(async () => {
        await initTachyonStore();
    });

    beforeEach(() => {
        vi.useFakeTimers();
        connect.mockClear();
        me.isAuthenticated = true;
        tachyonStore.isConnected = false;
        tachyonStore.wantsConnection = false;
    });

    afterEach(() => {
        tachyon.goOffline();
        vi.useRealTimers();
    });

    it("takes an open connection as wanting to be online", () => {
        simulateConnect();

        expect(tachyonStore.wantsConnection).toBe(true);
    });

    it("retries when a wanted connection drops", () => {
        simulateConnect();
        simulateClose();

        expect(tachyonStore.reconnectInterval).toBeDefined();

        vi.advanceTimersByTime(10000);
        expect(connect).toHaveBeenCalled();
    });

    it("stays quiet when the user asked to go offline", async () => {
        simulateConnect();
        await tachyon.goOffline();
        simulateClose();

        expect(tachyonStore.reconnectInterval).toBeUndefined();
    });

    // Logout drops the socket without going through disconnect(), so the intent
    // has to be cleared by the session ending rather than by that one call site.
    it("stays quiet when the session ends before the socket closes", () => {
        simulateConnect();

        simulateSessionEnd();
        simulateClose();

        expect(tachyonStore.wantsConnection).toBe(false);
        expect(tachyonStore.reconnectInterval).toBeUndefined();
    });

    it("gives up on a retry in progress when the session ends", () => {
        simulateConnect();
        simulateClose();
        expect(tachyonStore.reconnectInterval).toBeDefined();

        simulateSessionEnd();

        expect(tachyonStore.reconnectInterval).toBeUndefined();

        vi.advanceTimersByTime(30000);
        expect(connect).not.toHaveBeenCalled();
    });
});
