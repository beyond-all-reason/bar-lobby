// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { GameAI } from "@main/content/game/game-version";
import type { MapData } from "@main/content/maps/map-data";
import type { Player } from "@main/game/battle/battle-types";
import { Faction } from "@main/game/battle/battle-types";
import { describe, expect, it, vi } from "vitest";
import { BEGINNER_SKIRMISH_AI_SHORT_NAME, createBeginnerSkirmishTeams, getEligibleBeginnerSkirmishMaps, selectBeginnerSkirmishMap } from "@renderer/utils/beginner-skirmish";

function mapFixture(overrides: Partial<MapData> = {}): MapData {
    return {
        author: "BAR",
        certified: true,
        displayName: "Six Player Valley",
        filename: "six-player-valley.sd7",
        images: { preview: "preview.png" },
        mapHeight: 1024,
        mapLists: [],
        mapWidth: 1024,
        playerCountMax: 6,
        playerCountMin: 2,
        springName: "Six_Player_Valley",
        startboxesSet: [
            {
                maxPlayersPerStartbox: 3,
                startboxes: [{ poly: [] }, { poly: [] }],
            },
        ],
        tags: ["3v3"],
        terrain: ["grassy"],
        windMax: 10,
        windMin: 1,
        ...overrides,
    };
}

describe("beginner skirmish map selection", () => {
    it("accepts maps with six-player 3v3 capacity and two three-player boxes", () => {
        const map = mapFixture();

        expect(getEligibleBeginnerSkirmishMaps([map])).toEqual([{ map, startBoxesIndex: 0 }]);
    });

    it("rejects maps that do not satisfy the 3v3 capacity and box requirements", () => {
        const maps = [
            mapFixture({ springName: "wrong-tag", tags: ["2v2"] }),
            mapFixture({ springName: "too-small", playerCountMax: 5 }),
            mapFixture({ springName: "too-large-minimum", playerCountMin: 7 }),
            mapFixture({
                springName: "one-box",
                startboxesSet: [{ maxPlayersPerStartbox: 6, startboxes: [{ poly: [] }] }],
            }),
            mapFixture({
                springName: "three-boxes",
                startboxesSet: [
                    {
                        maxPlayersPerStartbox: 2,
                        startboxes: [{ poly: [] }, { poly: [] }, { poly: [] }],
                    },
                ],
            }),
            mapFixture({
                springName: "small-boxes",
                startboxesSet: [{ maxPlayersPerStartbox: 2, startboxes: [{ poly: [] }, { poly: [] }] }],
            }),
        ];

        expect(getEligibleBeginnerSkirmishMaps(maps)).toHaveLength(0);
    });

    it("retains the eligible start-box arrangement index", () => {
        const map = mapFixture({
            startboxesSet: [
                { maxPlayersPerStartbox: 3, startboxes: [{ poly: [] }, { poly: [] }, { poly: [] }] },
                { maxPlayersPerStartbox: 3, startboxes: [{ poly: [] }, { poly: [] }] },
            ],
        });

        expect(getEligibleBeginnerSkirmishMaps([map])).toEqual([{ map, startBoxesIndex: 1 }]);
    });

    it("selects an eligible map using the injected random source", () => {
        const maps = [mapFixture({ springName: "first" }), mapFixture({ springName: "second" })];

        expect(selectBeginnerSkirmishMap(maps, () => 0)?.map.springName).toBe("first");
        expect(selectBeginnerSkirmishMap(maps, () => 0.99)?.map.springName).toBe("second");
    });

    it("returns no selection when no eligible map exists", () => {
        expect(selectBeginnerSkirmishMap([mapFixture({ tags: ["1v1"] })], () => 0)).toBeUndefined();
    });
});

describe("beginner skirmish team construction", () => {
    const player = {
        id: 7,
        name: "Commander",
        user: { userId: 42, username: "Commander" },
        contentSyncState: { engine: 1, game: 1, map: 1 },
        inGame: false,
    } as unknown as Player;
    const ai: GameAI = {
        name: "BARb",
        shortName: BEGINNER_SKIRMISH_AI_SHORT_NAME,
        description: "BAR bot",
    };

    it("creates a human-led beginner 3v3 with five Armada BARb bots", () => {
        const nextParticipantId = vi.fn().mockReturnValueOnce(8).mockReturnValueOnce(9).mockReturnValueOnce(10).mockReturnValueOnce(11).mockReturnValueOnce(12);

        const teams = createBeginnerSkirmishTeams({ player, ai, nextParticipantId });

        expect(teams).toHaveLength(2);
        expect(teams.map((team) => team.participants)).toHaveLength(2);
        expect(teams[0].participants).toHaveLength(3);
        expect(teams[1].participants).toHaveLength(3);
        expect(teams[0].participants[0]).toMatchObject({ id: player.id, faction: Faction.Armada });

        const bots = teams.flatMap((team) => team.participants).filter((participant) => "aiShortName" in participant);
        expect(bots).toHaveLength(5);
        for (const bot of bots) {
            expect(bot).toMatchObject({
                aiShortName: BEGINNER_SKIRMISH_AI_SHORT_NAME,
                faction: Faction.Armada,
                host: player.id,
                aiOptions: { difficultyLevel: 0 },
            });
        }
        expect(new Set(bots.map((bot) => bot.id)).size).toBe(5);
        expect(nextParticipantId).toHaveBeenCalledTimes(5);
    });

    it("does not mutate the supplied player", () => {
        const nextParticipantId = vi.fn().mockReturnValue(8);

        createBeginnerSkirmishTeams({ player, ai, nextParticipantId });

        expect(player).not.toHaveProperty("faction");
    });
});
