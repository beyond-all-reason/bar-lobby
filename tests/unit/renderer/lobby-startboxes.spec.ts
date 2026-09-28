// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MapData } from "@main/content/maps/map-data";
import { encodeModoptionValue, rectsToArrangement } from "@shared/startbox-modoptions";

vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/store/db", () => ({ db: { maps: { get: vi.fn(async (springName: string) => ({ springName }) as MapData) } } }));

Object.assign(window.tachyon, {
    requestStructured: vi.fn(),
    onConnected: vi.fn(),
    onDisconnected: vi.fn(),
    onEvent: vi.fn(),
});
Object.defineProperty(window, "auth", { value: { onChanged: vi.fn() }, writable: true });

const { lobby, lobbyStore, initLobbyStore } = await import("@renderer/store/lobby.store");

const twoTeams = rectsToArrangement([
    { left: 0, top: 0, right: 0.2, bottom: 1 },
    { left: 0.8, top: 0, right: 1, bottom: 1 },
]);

describe("lobby start boxes", () => {
    beforeAll(async () => {
        await initLobbyStore();
    });

    beforeEach(() => {
        lobbyStore.activeLobby = undefined;
    });

    it("decodes the start box options the lobby holds", async () => {
        vi.mocked(window.tachyon.requestStructured).mockResolvedValue({
            status: "success",
            data: {
                id: "lobby-1",
                mapName: "Test Map",
                gameOptions: { mapmetadata_startbox_override: { value: await encodeModoptionValue(twoTeams) } },
                allyTeamConfig: {},
                players: {},
                spectators: {},
                bots: {},
            },
        } as Awaited<ReturnType<typeof window.tachyon.requestStructured>>);

        await lobby.requestJoinLobby({ id: "lobby-1", pushLobbyView: false });

        await vi.waitFor(() => expect(lobbyStore.activeLobby?.startboxes?.override).toEqual(twoTeams));
    });
});
