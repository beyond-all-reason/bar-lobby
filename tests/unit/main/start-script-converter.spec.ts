// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import zlib from "zlib";
import { describe, expect, it } from "vitest";

import { BattleWithMetadata, GameModeID, StartPosType } from "@main/game/battle/battle-types";
import { startScriptConverter } from "@main/utils/start-script-converter";

const polygonSet = [
    {
        maxPlayersPerStartbox: 8,
        startboxes: [
            {
                poly: [
                    { x: 0, y: 0 },
                    { x: 60, y: 0 },
                    { x: 30, y: 60, strength: 1 },
                ],
            },
            {
                poly: [
                    { x: 140, y: 200 },
                    { x: 200, y: 200 },
                    { x: 170, y: 140 },
                ],
            },
        ],
    },
];

function twoTeamBattle(mapOptions: Record<string, unknown>): BattleWithMetadata {
    return {
        isOnline: false,
        spectators: [],
        me: { id: 0, user: { username: "p1", userId: 1 } },
        teams: [{ participants: [{ id: 0, user: { username: "p1", userId: 1 } }] }, { participants: [{ id: 1, user: { username: "p2", userId: 2 } }] }],
        battleOptions: {
            gameVersion: "test",
            gameMode: { id: GameModeID.CLASSIC, label: "Classic", options: {} },
            map: { springName: "Test Map", startboxesSet: polygonSet },
            mapOptions,
            restrictions: [],
        },
    } as unknown as BattleWithMetadata;
}

function extractSet(script: string): Record<string, { startboxes: { poly: { x: number; y: number; strength?: number }[] }[] }> {
    const match = script.match(/mapmetadata_startboxes_set\s*=\s*([^;\s}]+)/);
    if (!match) throw new Error("modoption not found in start script");
    return JSON.parse(zlib.inflateSync(Buffer.from(match[1], "base64url")).toString());
}

describe("start script polygon startbox modoption", () => {
    it("injects the set keyed by team count when a preset is selected", () => {
        const script = startScriptConverter.generateScriptStr(twoTeamBattle({ startPosType: StartPosType.Boxes, startBoxesIndex: 0 }));

        expect(script).toContain("mapmetadata_startboxes_set");

        const set = extractSet(script);
        expect(Object.keys(set)).toEqual(["2"]);
        expect(set["2"].startboxes).toHaveLength(2);
        expect(set["2"].startboxes[0].poly[2].strength).toBe(1);
    });

    it("omits the modoption for custom drag-edited boxes", () => {
        const script = startScriptConverter.generateScriptStr(
            twoTeamBattle({
                startPosType: StartPosType.Boxes,
                customStartBoxes: [
                    { left: 0, top: 0, right: 0.25, bottom: 1 },
                    { left: 0.75, top: 0, right: 1, bottom: 1 },
                ],
            })
        );

        expect(script).not.toContain("mapmetadata_startboxes_set");
    });
});
