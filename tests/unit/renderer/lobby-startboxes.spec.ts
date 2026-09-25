// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { LobbyUpdateRequestData } from "tachyon-protocol/types";
import { MapData } from "@main/content/maps/map-data";
import { decodeModoptionValue, encodeModoptionValue, polyToStartBox, rectsToArrangement } from "@shared/startbox-modoptions";

const maps = vi.hoisted(() => new Map<string, unknown>());

vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/store/db", () => ({ db: { maps: { get: vi.fn(async (springName: string) => maps.get(springName)) } } }));

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
const { isStartboxWriter } = await import("@renderer/utils/lobby-startboxes");

const emit = (command: string, data: unknown) => handlers.get(command)?.(data);

const twoTeams = rectsToArrangement([
    { left: 0, top: 0, right: 0.2, bottom: 1 },
    { left: 0.8, top: 0, right: 1, bottom: 1 },
]);
const threeTeams = rectsToArrangement([
    { left: 0, top: 0, right: 0.2, bottom: 0.2 },
    { left: 0.8, top: 0, right: 1, bottom: 0.2 },
    { left: 0.4, top: 0.8, right: 0.6, bottom: 1 },
]);
maps.set("Old Map", { springName: "Old Map" } as MapData);
maps.set("Next Map", {
    springName: "Next Map",
    startboxesSet: [
        { maxPlayersPerStartbox: 1, ...twoTeams },
        { maxPlayersPerStartbox: 1, ...threeTeams },
    ],
} as MapData);

const wholeMap = { top: 0, bottom: 1, left: 0, right: 1 };

async function joinLobby(overrides: Record<string, unknown>) {
    vi.mocked(window.tachyon.requestStructured).mockResolvedValue({
        status: "success",
        data: {
            id: "lobby-1",
            mapName: "Old Map",
            gameOptions: { mapmetadata_startbox_override: { value: await encodeModoptionValue(twoTeams) } },
            allyTeamConfig: {
                "0": { maxTeams: 1, startBox: wholeMap, teams: { "0": { maxPlayers: 1 } } },
                "1": { maxTeams: 1, startBox: wholeMap, teams: { "0": { maxPlayers: 1 } } },
            },
            areBossesEnabled: false,
            bosses: {},
            players: { "1": {}, "2": {} },
            spectators: {},
            bots: {},
            ...overrides,
        },
    } as Awaited<ReturnType<typeof window.tachyon.requestStructured>>);
    await lobby.requestJoinLobby({ id: "lobby-1", pushLobbyView: false });
    vi.mocked(window.tachyon.requestStructured).mockClear();
}

function lobbyUpdates() {
    return vi
        .mocked(window.tachyon.requestStructured)
        .mock.calls.filter(([command]) => command === "lobby/update")
        .map(([, data]) => data as LobbyUpdateRequestData);
}

describe("lobby start boxes", () => {
    beforeAll(async () => {
        me.userId = "1";
        await initLobbyStore();
    });

    beforeEach(() => {
        lobbyStore.activeLobby = undefined;
        vi.mocked(window.tachyon.requestStructured).mockReset();
    });

    it("decodes the start box options the lobby holds", async () => {
        await joinLobby({});

        await vi.waitFor(() => expect(lobbyStore.activeLobby?.startboxes?.override).toEqual(twoTeams));
    });

    it("writes the new map's defaults once a map change lands", async () => {
        await joinLobby({});

        emit("lobby/updated", { id: "lobby-1", mapName: "Next Map" });

        await vi.waitFor(() => expect(lobbyUpdates()).toHaveLength(1));
        const [update] = lobbyUpdates();
        expect(update.gameOptions?.mapmetadata_startbox_override).toBeNull();
        expect(await decodeModoptionValue(update.gameOptions?.mapmetadata_startboxes_set?.value)).toEqual({
            "2": { maxPlayersPerStartbox: 1, ...twoTeams },
            "3": { maxPlayersPerStartbox: 1, ...threeTeams },
        });
        expect(update.allyTeamConfig?.map((allyTeam) => allyTeam.startBox)).toEqual(twoTeams.startboxes.map((box) => polyToStartBox(box.poly)));
    });
});

describe("isStartboxWriter", () => {
    const members = { players: { "7": {}, "3": {} }, spectators: { "5": {} } } as unknown as Parameters<typeof isStartboxWriter>[0];

    it("picks the same single client for everyone, from the users allowed to update the lobby", () => {
        expect(["3", "5", "7"].filter((id) => isStartboxWriter({ ...members, areBossesEnabled: false, bosses: {} }, id))).toEqual(["3"]);
        expect(["3", "5", "7"].filter((id) => isStartboxWriter({ ...members, areBossesEnabled: true, bosses: { "7": {} } }, id))).toEqual(["7"]);
    });
});
