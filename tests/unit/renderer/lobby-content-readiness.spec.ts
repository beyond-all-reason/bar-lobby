// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { effectScope, nextTick } from "vue";
import type { EngineVersion } from "@main/content/engine/engine-version";
import type { GameVersion } from "@main/content/game/game-version";
import type { Lobby } from "@renderer/model/lobby";

vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));

Object.assign(window.tachyon, {
    requestStructured: vi.fn(),
    onConnected: vi.fn(),
    onDisconnected: vi.fn(),
    onEvent: vi.fn(),
});
Object.defineProperty(window, "auth", { value: { onChanged: vi.fn() }, writable: true });

const { lobby, lobbyStore } = await import("@renderer/store/lobby.store");
const { mapsStore } = await import("@renderer/store/maps.store");
const { gameStore } = await import("@renderer/store/game.store");
const { enginesStore } = await import("@renderer/store/engine.store");
const { me } = await import("@renderer/store/me.store");
const { useLobbyContentReadiness } = await import("@renderer/composables/useLobbyContentReadiness");

const ME = "user-me";

const asPlayer = { players: { [ME]: { id: ME } }, spectators: {} } as unknown as Pick<Lobby, "players" | "spectators">;
const asSpectator = { players: {}, spectators: { [ME]: { id: ME } } } as unknown as Pick<Lobby, "players" | "spectators">;

const lobbyWith = (content: Partial<Pick<Lobby, "mapName" | "gameVersion" | "engineVersion" | "players" | "spectators">> = {}) =>
    ({ id: "lobby-1", mapName: "Map A", gameVersion: "game-1", engineVersion: "engine-1", ...asPlayer, ...content }) as Lobby;

const engine = (id: string, installed: boolean) => ({ id, installed }) as EngineVersion;

function installEverything() {
    mapsStore.availableMapNames = new Set(["Map A"]);
    gameStore.availableGameVersions = new Map([["game-1", { gameVersion: "game-1" } as GameVersion]]);
    enginesStore.availableEngineVersions = [engine("engine-1", true)];
}

describe("useLobbyContentReadiness", () => {
    let requestStatus: MockInstance<typeof lobby.requestUpdateClientStatus>;
    let scope: ReturnType<typeof effectScope>;

    function mount() {
        return scope.run(() => useLobbyContentReadiness())!;
    }

    beforeEach(() => {
        requestStatus = vi.spyOn(lobby, "requestUpdateClientStatus").mockResolvedValue(undefined);
        scope = effectScope();
        me.userId = ME;
        lobbyStore.activeLobby = undefined;
        mapsStore.availableMapNames = new Set();
        gameStore.availableGameVersions = new Map();
        enginesStore.availableEngineVersions = [];
    });

    afterEach(() => {
        scope.stop();
        vi.restoreAllMocks();
    });

    it("reports nothing and sends nothing without an active lobby", async () => {
        const { isMapNeeded, isContentMissing } = mount();
        await nextTick();

        expect(isMapNeeded.value).toBe(false);
        expect(isContentMissing.value).toBe(false);
        expect(requestStatus).not.toHaveBeenCalled();
    });

    it("is ready when map, game and engine are installed", async () => {
        installEverything();
        lobbyStore.activeLobby = lobbyWith();
        const { isContentMissing } = mount();

        expect(isContentMissing.value).toBe(false);
        expect(requestStatus).toHaveBeenCalledExactlyOnceWith({ isReady: true });
    });

    it.each([
        ["map", () => (mapsStore.availableMapNames = new Set())],
        ["game", () => (gameStore.availableGameVersions = new Map())],
        ["engine", () => (enginesStore.availableEngineVersions = [])],
        ["engine (listed but not installed)", () => (enginesStore.availableEngineVersions = [engine("engine-1", false)])],
    ])("is not ready when the %s is missing", (_name, removeContent) => {
        installEverything();
        removeContent();
        lobbyStore.activeLobby = lobbyWith();
        const { isContentMissing } = mount();

        expect(isContentMissing.value).toBe(true);
        expect(requestStatus).toHaveBeenCalledExactlyOnceWith({ isReady: false });
    });

    it("only flags the map as needed when the map is the missing piece", () => {
        installEverything();
        mapsStore.availableMapNames = new Set();
        lobbyStore.activeLobby = lobbyWith();
        const { isMapNeeded } = mount();
        expect(isMapNeeded.value).toBe(true);

        mapsStore.availableMapNames = new Set(["Map A"]);
        gameStore.availableGameVersions = new Map();
        expect(isMapNeeded.value).toBe(false);
    });

    it("becomes ready once the missing content finishes installing", async () => {
        installEverything();
        gameStore.availableGameVersions = new Map();
        lobbyStore.activeLobby = lobbyWith();
        mount();
        expect(requestStatus).toHaveBeenLastCalledWith({ isReady: false });

        gameStore.availableGameVersions = new Map([["game-1", { gameVersion: "game-1" } as GameVersion]]);
        await nextTick();

        expect(requestStatus).toHaveBeenLastCalledWith({ isReady: true });
        expect(requestStatus).toHaveBeenCalledTimes(2);
    });

    it("becomes not ready when the host switches to content that is not installed", async () => {
        installEverything();
        lobbyStore.activeLobby = lobbyWith();
        mount();
        expect(requestStatus).toHaveBeenLastCalledWith({ isReady: true });

        lobbyStore.activeLobby = lobbyWith({ engineVersion: "engine-2" });
        await nextTick();

        expect(requestStatus).toHaveBeenLastCalledWith({ isReady: false });
    });

    it("does not resend while the result stays the same", async () => {
        installEverything();
        lobbyStore.activeLobby = lobbyWith();
        mount();

        mapsStore.availableMapNames = new Set(["Map A", "Map B"]);
        lobbyStore.activeLobby = lobbyWith({ mapName: "Map B" });
        await nextTick();

        expect(requestStatus).toHaveBeenCalledTimes(1);
    });

    it("stops sending after leaving the lobby", async () => {
        installEverything();
        lobbyStore.activeLobby = lobbyWith();
        mount();

        lobbyStore.activeLobby = undefined;
        await nextTick();

        expect(requestStatus).toHaveBeenCalledTimes(1);
    });

    // Joining an open lobby makes you a spectator, and the server refuses readiness from spectators.
    it("sends nothing while spectating", async () => {
        installEverything();
        lobbyStore.activeLobby = lobbyWith(asSpectator);
        const { isContentMissing } = mount();
        await nextTick();

        expect(isContentMissing.value).toBe(false);
        expect(requestStatus).not.toHaveBeenCalled();
    });

    it("reports readiness once a spectator joins a team, though the content did not change", async () => {
        installEverything();
        lobbyStore.activeLobby = lobbyWith(asSpectator);
        mount();

        lobbyStore.activeLobby = lobbyWith(asPlayer);
        await nextTick();

        expect(requestStatus).toHaveBeenCalledExactlyOnceWith({ isReady: true });
    });

    it("reports readiness again after a player spectates and rejoins a team", async () => {
        installEverything();
        lobbyStore.activeLobby = lobbyWith();
        mount();

        lobbyStore.activeLobby = lobbyWith(asSpectator);
        await nextTick();
        lobbyStore.activeLobby = lobbyWith(asPlayer);
        await nextTick();

        expect(requestStatus).toHaveBeenCalledTimes(2);
        expect(requestStatus).toHaveBeenLastCalledWith({ isReady: true });
    });
});
