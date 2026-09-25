// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MapData } from "@main/content/maps/map-data";
import { StartPosType } from "@main/game/battle/battle-types";
import { getCurrentArrangement, getCurrentStartBoxes, withStartboxOverride } from "@renderer/utils/battle-map-options";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

vi.mock("@renderer/store/db", () => ({
    db: { maps: {}, nonLiveMaps: {}, replays: {}, users: {} },
}));

vi.mock("@renderer/store/game.store", () => ({
    gameStore: { selectedGameVersion: undefined },
    startBattle: vi.fn(),
}));

vi.mock("@renderer/store/engine.store", () => ({
    enginesStore: { selectedEngineVersion: undefined },
}));

vi.mock("@renderer/store/maps.store", () => ({
    getRandomMap: vi.fn(),
}));

vi.mock("@renderer/store/me.store", () => ({
    me: { userId: "1", username: "me", status: "menu", battleRoomState: {} },
}));

vi.mock("@renderer/api/notifications", () => ({
    notificationsApi: { alert: vi.fn() },
}));

const { battleStore, battleActions } = await import("@renderer/store/battle.store");

function mapWith(startboxesSet: MapData["startboxesSet"]) {
    return { springName: "Test Map", playerCountMax: 8, startboxesSet } as MapData;
}

const twoBoxPreset = [
    {
        maxPlayersPerStartbox: 4,
        startboxes: [
            {
                poly: [
                    { x: 0, y: 0 },
                    { x: 40, y: 200 },
                ],
            },
            {
                poly: [
                    { x: 160, y: 0 },
                    { x: 200, y: 200 },
                ],
            },
        ],
    },
];

describe("getCurrentStartBoxes", () => {
    beforeEach(async () => {
        battleActions.resetToDefaultBattle();
        await nextTick();
        battleStore.battleOptions.mapOptions = { startPosType: StartPosType.Boxes, startBoxesIndex: 0 };
    });

    it("leaves a chosen preset alone while no map is selected yet", () => {
        battleActions.getCurrentStartBoxes();

        expect(battleStore.battleOptions.mapOptions.startBoxesIndex).toBe(0);
        expect(battleStore.battleOptions.mapOptions.customStartBoxes).toBeUndefined();
    });

    it("returns the preset boxes for the selected index", () => {
        battleStore.battleOptions.map = mapWith(twoBoxPreset);
        battleStore.battleOptions.mapOptions.startBoxesIndex = 0;

        expect(battleActions.getCurrentStartBoxes()).toEqual([
            { left: 0, top: 0, right: 0.2, bottom: 1 },
            { left: 0.8, top: 0, right: 1, bottom: 1 },
        ]);
    });

    it("falls back to east vs west for a map that ships no presets", async () => {
        battleStore.battleOptions.map = mapWith([]);
        await nextTick();

        expect(battleStore.battleOptions.mapOptions.startBoxesIndex).toBeUndefined();
        expect(battleActions.getCurrentStartBoxes()).toHaveLength(2);
    });

    it("selects preset 0 when a map with presets is chosen", async () => {
        battleStore.battleOptions.map = mapWith(twoBoxPreset);
        await nextTick();

        expect(battleStore.battleOptions.mapOptions.startBoxesIndex).toBe(0);
    });

    it("adds one team per box when pasted start boxes outnumber the teams", async () => {
        battleStore.battleOptions.map = mapWith([]);
        await nextTick();
        const override = {
            startboxes: [0, 1, 2, 3].map((i) => ({
                poly: [
                    { x: i * 50, y: 0 },
                    { x: i * 50 + 40, y: 200 },
                ],
            })),
        };

        battleStore.battleOptions.mapOptions = withStartboxOverride(battleStore.battleOptions.mapOptions, override);
        await nextTick();

        expect(battleStore.teams).toHaveLength(4);
        expect(battleStore.battleOptions.mapOptions.customStartBoxes).toHaveLength(4);
    });

    it("keeps the other teams' pasted shapes when a team is deleted", async () => {
        battleStore.battleOptions.map = mapWith([]);
        await nextTick();
        const triangle = (x: number) => [
            { x, y: 0 },
            { x: x + 40, y: 0 },
            { x: x + 20, y: 60 },
        ];
        const shapes = [triangle(0), triangle(80), triangle(160)];
        battleStore.battleOptions.mapOptions = withStartboxOverride(battleStore.battleOptions.mapOptions, { startboxes: shapes.map((poly) => ({ poly })) });
        await nextTick();

        battleActions.removeTeam(1);
        await nextTick();

        expect(getCurrentArrangement(battleStore.battleOptions.map, battleStore.battleOptions.mapOptions)?.startboxes.map((box) => box.poly)).toEqual([shapes[0], shapes[2]]);
    });

    it("resolves boxes without depending on the battle store", () => {
        expect(
            getCurrentStartBoxes(mapWith(twoBoxPreset), {
                startPosType: StartPosType.Boxes,
                startBoxesIndex: 0,
            })
        ).toEqual([
            { left: 0, top: 0, right: 0.2, bottom: 1 },
            { left: 0.8, top: 0, right: 1, bottom: 1 },
        ]);
    });
});
