// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));

const handlers = new Map<string, (data: unknown) => void>();

Object.assign(window.tachyon, {
    requestStructured: vi.fn(),
    onConnected: vi.fn(),
    onDisconnected: vi.fn(),
    onEvent: (command: string, callback: (data: unknown) => void) => void handlers.set(command, callback),
});
Object.defineProperty(window, "auth", { value: { onChanged: vi.fn() }, writable: true });

const { lobby, lobbyStore, initLobbyStore } = await import("@renderer/store/lobby.store");
const { me } = await import("@renderer/store/me.store");
const { tachyonStore } = await import("@renderer/store/tachyon.store");

const emit = (command: string, data: unknown) => handlers.get(command)?.(data);

describe("battle rejoin state", () => {
    beforeAll(async () => {
        me.userId = "1";
        await initLobbyStore();
    });

    beforeEach(() => {
        lobbyStore.activeLobby = undefined;
        tachyonStore.springConnectionDetails = undefined;
        tachyonStore.rejoinModalOpen = false;
        vi.mocked(window.tachyon.requestStructured).mockReset();
    });

    it("clears stale rejoin state when a lobby update removes the battle", async () => {
        const joinResponse = {
            status: "success",
            data: { id: "lobby-1", players: {}, spectators: {}, bots: {}, currentBattle: { id: "battle-1" } },
        } satisfies Awaited<ReturnType<typeof window.tachyon.requestStructured>>;
        vi.mocked(window.tachyon.requestStructured).mockResolvedValue(joinResponse);
        await lobby.requestJoinLobby({ id: "lobby-1", pushLobbyView: true });
        tachyonStore.springConnectionDetails = {
            username: "player",
            password: "secret",
            ips: ["127.0.0.1"],
            port: 8452,
            engine: { version: "engine-version" },
            game: { springName: "game-version" },
            battleId: "battle-1",
        } satisfies NonNullable<typeof tachyonStore.springConnectionDetails>;
        tachyonStore.rejoinModalOpen = true;

        emit("lobby/updated", { id: "lobby-1", currentBattle: null });

        expect(tachyonStore.springConnectionDetails).toBeUndefined();
        expect(tachyonStore.rejoinModalOpen).toBe(false);
    });
});
