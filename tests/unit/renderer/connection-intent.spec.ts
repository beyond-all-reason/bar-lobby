// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { BattleEndedEventData, BattleStartRequestData, PrivateBattle } from "tachyon-protocol/types";

vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));

vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));

const connectHandlers: Array<() => void> = [];
const disconnectHandlers: Array<() => void> = [];
const authHandlers: Array<(state: { authenticated: boolean }) => void> = [];
const battleStartHandlers: Array<(battle: BattleStartRequestData) => void> = [];
const battleEndedHandlers: Array<(data: BattleEndedEventData) => void> = [];

const connect = vi.fn(async () => {});
const disconnect = vi.fn(async () => {});
const launchMultiplayer = vi.fn();

Object.assign(window.tachyon, {
    isConnected: vi.fn(async () => false),
    connect,
    disconnect,
    requestStructured: vi.fn(async () => ({ status: "success", data: {} })),
    onConnected: (callback: () => void) => void connectHandlers.push(callback),
    onDisconnected: (callback: () => void) => void disconnectHandlers.push(callback),
    onBattleStart: (callback: (battle: BattleStartRequestData) => void) => void battleStartHandlers.push(callback),
    onBattleEnded: (callback: (data: BattleEndedEventData) => void) => void battleEndedHandlers.push(callback),
});

Object.defineProperty(window, "auth", {
    value: { onChanged: (callback: (state: { authenticated: boolean }) => void) => void authHandlers.push(callback) },
    writable: true,
});

Object.defineProperty(window, "game", { value: { launchMultiplayer }, writable: true });

const { tachyonStore, tachyon, initTachyonStore } = await import("@renderer/store/tachyon.store");
const { me } = await import("@renderer/store/me.store");
const { onUserSelfBattleSignal } = await import("@renderer/utils/user-self-signal");

const simulateConnect = () => connectHandlers.forEach((handler) => handler());
const simulateClose = () => disconnectHandlers.forEach((handler) => handler());
const simulateSessionEnd = () => authHandlers.forEach((handler) => handler({ authenticated: false }));
const simulateBattleEnded = () => battleEndedHandlers.forEach((handler) => handler({ battleId: "battle-1", players: [], spectators: [], winningAllyTeamIds: [] } satisfies BattleEndedEventData));

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
        tachyonStore.rejoinModalOpen = false;
        tachyonStore.springConnectionDetails = undefined;
        launchMultiplayer.mockClear();
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

    it("stores and immediately launches a server-started battle", () => {
        const battle = {
            ip: "127.0.0.1",
            port: 8452,
            username: "player",
            password: "secret",
            engine: { version: "engine-version" },
            game: { springName: "game-version" },
            map: { springName: "map-version" },
        } satisfies BattleStartRequestData;

        battleStartHandlers.forEach((handler) => handler(battle));

        expect(tachyonStore.springConnectionDetails).toEqual(battle);
        expect(tachyonStore.rejoinModalOpen).toBe(false);
        expect(launchMultiplayer).toHaveBeenCalledWith({
            engineVersion: "engine-version",
            gameVersion: "game-version",
            springString: "spring://player:secret@127.0.0.1:8452",
        });
    });

    it("stores a user/self currentBattle signal and opens the rejoin prompt without launching", () => {
        const battle = {
            ip: "127.0.0.1",
            port: 8452,
            username: "player",
            password: "secret",
            engine: { version: "engine-version" },
            game: { springName: "game-version" },
            map: { springName: "map-version" },
        } satisfies PrivateBattle;

        onUserSelfBattleSignal.dispatch(battle);

        expect(tachyonStore.springConnectionDetails).toEqual(battle);
        expect(tachyonStore.rejoinModalOpen).toBe(true);
        expect(launchMultiplayer).not.toHaveBeenCalled();
        // We claim that springConnectionDetails is not undefined because the test above already checked it, or failed.
        tachyon.launchMultiplayerBattle(tachyonStore.springConnectionDetails!);

        expect(launchMultiplayer).toHaveBeenCalledWith({
            engineVersion: "engine-version",
            gameVersion: "game-version",
            springString: "spring://player:secret@127.0.0.1:8452",
        });
    });

    it("clears spring connection details when a battle/ended event is received", () => {
        tachyonStore.springConnectionDetails = {
            ip: "127.0.0.1",
            port: 8452,
            username: "player",
            password: "secret",
            engine: { version: "engine-version" },
            game: { springName: "game-version" },
        };

        simulateBattleEnded();

        expect(tachyonStore.springConnectionDetails).toBeUndefined();
    });
});
