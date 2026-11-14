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
const { resolveLobbyArrangement, startboxShortfall } = await import("@renderer/utils/lobby-startboxes");

const twoTeams = rectsToArrangement([
    { left: 0, top: 0, right: 0.2, bottom: 1 },
    { left: 0.8, top: 0, right: 1, bottom: 1 },
]);
const threeTeams = rectsToArrangement([
    { left: 0, top: 0, right: 0.2, bottom: 0.2 },
    { left: 0.8, top: 0, right: 1, bottom: 0.2 },
    { left: 0.4, top: 0.8, right: 0.6, bottom: 1 },
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

describe("startboxShortfall", () => {
    it("blocks the start when an ally team would have no start box", () => {
        expect(startboxShortfall({ override: twoTeams }, 3)).toEqual({ boxed: 2, teams: 3 });
        expect(startboxShortfall({ set: { "2": twoTeams } }, 3)).toEqual({ boxed: 2, teams: 3 });
        expect(startboxShortfall({}, 2)).toEqual({ boxed: 0, teams: 2 });
    });

    it("prefers the override over a set that would cover every ally team", () => {
        expect(startboxShortfall({ override: twoTeams, set: { "3": threeTeams } }, 3)).toEqual({ boxed: 2, teams: 3 });
    });

    it("draws spare boxes out and lets the start through", () => {
        expect(resolveLobbyArrangement({ override: threeTeams }, 2)?.startboxes).toEqual(threeTeams.startboxes.slice(0, 2));
        expect(resolveLobbyArrangement({ set: { "3": threeTeams } }, 2)?.startboxes).toEqual(threeTeams.startboxes.slice(0, 2));
        expect(startboxShortfall({ override: threeTeams }, 2)).toBeUndefined();
        expect(startboxShortfall({ set: { "3": threeTeams } }, 2)).toBeUndefined();
    });

    it("waits for the lobby's game options to be decoded", () => {
        expect(startboxShortfall(undefined, 2)).toBeUndefined();
    });
});
