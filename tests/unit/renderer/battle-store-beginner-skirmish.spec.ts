// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { MapData } from "@main/content/maps/map-data";
import { Faction, GameModeID, isBot, StartPosType } from "@main/game/battle/battle-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockEngineStore = {
    selectedEngineVersion:
        | {
              id: string;
              ais: { name: string; shortName: string; version: string; description: string }[];
              installed: boolean;
          }
        | undefined;
};
const engineStore = vi.hoisted(() => ({
    selectedEngineVersion: {
        id: "engine-1",
        ais: [{ name: "BARb", shortName: "BARb", version: "1", description: "Beginner AI" }],
        installed: true,
    },
})) as MockEngineStore;
type MockGameStore = {
    selectedGameVersion:
        | {
              gameVersion: string;
              packageMd5: string;
              luaOptionSections: unknown[];
              ais: { name: string; shortName: string; description: string }[];
          }
        | undefined;
};
const gameStore = vi.hoisted(() => ({
    selectedGameVersion: {
        gameVersion: "game-1",
        packageMd5: "checksum",
        luaOptionSections: [],
        ais: [],
    },
})) as MockGameStore;
const db = vi.hoisted(() => ({ maps: { toArray: vi.fn() } }));
const launchBattle = vi.hoisted(() => vi.fn());

vi.mock("@renderer/store/engine.store", () => ({ enginesStore: engineStore }));
vi.mock("@renderer/store/game.store", () => ({ gameStore, startBattle: launchBattle }));
vi.mock("@renderer/store/db", () => ({ db }));
vi.mock("@renderer/store/me.store", () => ({
    me: { userId: 1, username: "Alex", battleRoomState: { isReady: false, isSpectator: false } },
}));
vi.mock("@renderer/store/maps.store", () => ({ getRandomMap: vi.fn() }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));

import { battleActions, battleStore } from "@renderer/store/battle.store";

function mapFixture(): MapData {
    return {
        author: "Map author",
        certified: true,
        displayName: "Eligible map",
        filename: "Eligible map.sd7",
        images: { preview: "preview" },
        mapHeight: 8,
        mapLists: [],
        mapWidth: 8,
        playerCountMax: 6,
        playerCountMin: 2,
        springName: "Eligible map",
        startboxesSet: [{ maxPlayersPerStartbox: 3, startboxes: [{ poly: [] }, { poly: [] }] }],
        tags: ["3v3"],
        terrain: [],
        windMax: 0,
        windMin: 0,
    };
}

describe("battleActions.createBeginnerSkirmish", () => {
    beforeEach(() => {
        engineStore.selectedEngineVersion = {
            id: "engine-1",
            ais: [{ name: "BARb", shortName: "BARb", version: "1", description: "Beginner AI" }],
            installed: true,
        };
        gameStore.selectedGameVersion = {
            gameVersion: "game-1",
            packageMd5: "checksum",
            luaOptionSections: [],
            ais: [],
        };
        db.maps.toArray.mockResolvedValue([mapFixture()]);
        launchBattle.mockReset();
        battleStore.isLobbyOpened = false;
        battleStore.isSelectingGameMode = true;
        battleActions.resetToDefaultBattle();
    });

    it("uses Classic initialization before applying a complete beginner 3v3 preset", async () => {
        db.maps.toArray.mockResolvedValue([
            {
                ...mapFixture(),
                startboxesSet: [
                    { maxPlayersPerStartbox: 6, startboxes: [{ poly: [] }] },
                    { maxPlayersPerStartbox: 3, startboxes: [{ poly: [] }, { poly: [] }] },
                ],
            },
        ]);
        const result = await battleActions.createBeginnerSkirmish();

        expect(result).toEqual({ ok: true });
        expect(battleStore.battleOptions).toMatchObject({
            engineVersion: "engine-1",
            gameVersion: "game-1",
            gameMode: { id: GameModeID.CLASSIC },
            map: { springName: "Eligible map" },
            mapOptions: { startPosType: StartPosType.Boxes, startBoxesIndex: 1 },
            restrictions: [],
        });
        expect(battleStore.teams.map((team) => team.participants.length)).toEqual([3, 3]);
        expect(battleStore.me?.faction).toBe(Faction.Armada);
        expect(battleStore.spectators).toEqual([]);

        const bots = battleStore.teams.flatMap((team) => team.participants.filter(isBot));
        expect(bots).toHaveLength(5);
        expect(bots.every((bot) => bot.aiShortName === "BARb" && bot.faction === Faction.Armada && bot.aiOptions.difficultyLevel === 0)).toBe(true);
        expect(launchBattle).not.toHaveBeenCalled();
        expect(battleStore.isLobbyOpened).toBe(false);
    });

    it("uses BARb from the game when the engine does not provide it", async () => {
        engineStore.selectedEngineVersion!.ais = [] as never;
        gameStore.selectedGameVersion!.ais = [{ name: "Game BARb", shortName: "BARb", description: "Game-provided beginner AI" }] as never;

        const result = await battleActions.createBeginnerSkirmish();

        expect(result).toEqual({ ok: true });
        expect(
            battleStore.teams
                .flatMap((team) => team.participants)
                .filter(isBot)
                .every((bot) => bot.name.startsWith("Game BARb"))
        ).toBe(true);
    });

    it.each([
        ["missing engine", "content-required", () => (engineStore.selectedEngineVersion = undefined as never)],
        ["missing game", "content-required", () => (gameStore.selectedGameVersion = undefined as never)],
        ["missing player", "player-required", () => (battleStore.me = undefined as never)],
        ["missing BARb", "ai-unavailable", () => (engineStore.selectedEngineVersion!.ais = [] as never)],
    ] as const)("returns %s without creating a partial preset", async (_caseName, reason, invalidate) => {
        invalidate();

        const result = await battleActions.createBeginnerSkirmish();

        expect(result).toEqual({ ok: false, reason });
        expect(battleStore.teams.flatMap((team) => team.participants.filter(isBot))).toHaveLength(0);
        expect(launchBattle).not.toHaveBeenCalled();
        expect(battleStore.isLobbyOpened).toBe(false);
    });

    it("returns no-eligible-map without creating a partial preset", async () => {
        db.maps.toArray.mockResolvedValue([{ ...mapFixture(), tags: ["1v1"] }]);

        const result = await battleActions.createBeginnerSkirmish();

        expect(result).toEqual({ ok: false, reason: "no-eligible-map" });
        expect(battleStore.teams.flatMap((team) => team.participants.filter(isBot))).toHaveLength(0);
        expect(launchBattle).not.toHaveBeenCalled();
        expect(battleStore.isLobbyOpened).toBe(false);
    });

    it("returns unexpected when map retrieval fails", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
        db.maps.toArray.mockRejectedValue(new Error("database unavailable"));

        const result = await battleActions.createBeginnerSkirmish();

        expect(result).toEqual({ ok: false, reason: "unexpected" });
        expect(error).toHaveBeenCalledWith("Failed to create beginner skirmish", expect.any(Error));
        error.mockRestore();
    });
});
