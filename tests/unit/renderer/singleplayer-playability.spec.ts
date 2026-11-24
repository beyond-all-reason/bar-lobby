// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineVersion } from "@main/content/engine/engine-version";
import type { GameVersion } from "@main/content/game/game-version";
import type { Info } from "@main/services/info.service";
import { t } from "@renderer/i18n";
import type { Compatibility } from "@shared/content/schema/common";
import type { SingleplayerCampaign, SingleplayerMission, SingleplayerScenario } from "@shared/content/singleplayer";
import { Edition, editionFeatures } from "@shared/edition";
import type { InstallDefaults } from "@shared/install-defaults";

const api = vi.hoisted(() => ({ list: vi.fn(), getSaves: vi.fn(), recordResult: vi.fn(), setDifficulty: vi.fn(), deleteSave: vi.fn(), deleteAllSaves: vi.fn(), onSaveChanged: vi.fn() }));
vi.mock("@renderer/api/singleplayer", () => ({ singleplayerApi: api }));

const { infosActions } = await import("@renderer/store/infos.store");
const { mapsStore } = await import("@renderer/store/maps.store");
const { enginesStore } = await import("@renderer/store/engine.store");
const { gameStore } = await import("@renderer/store/game.store");
const { singleplayerActions } = await import("@renderer/store/singleplayer.store");
const { initSingleplayerLogic, singleplayerLogic } = await import("@renderer/logic/singleplayer");

const ENGINE = "2025.04.10";
const GAME = "Beyond All Reason test-28000-aaaaaaa";
const OTHER_GAME = "Beyond All Reason test-28200-ccccccc";
const INSTALLED_MAP = "Quicksilver Remake 1.24";
const MISSING_MAP = "Supreme Isthmus v1.6.4";
const PLAYS_HERE: Compatibility = [{ engineVersion: ENGINE, gameVersions: [GAME] }];
const PLAYS_ELSEWHERE: Compatibility = [{ engineVersion: ENGINE, gameVersions: [OTHER_GAME] }];

function asEdition(edition: Edition, installDefaults: InstallDefaults = {}) {
    infosActions.set({ edition, features: editionFeatures(edition), installDefaults } as Info);
}

const mission = (id: string, mapName: string, maps: string[] = []) =>
    ({ id, path: id, manifest: { titleKey: `${id}.title`, mapName }, language: { en: { [`${id}.title`]: `Mission ${id}` } }, maps }) as unknown as SingleplayerMission;

function scenario(mapName: string, { compatibility = PLAYS_HERE, maps = [] as string[], kind = "scenario" as "scenario" | "tutorial", withoutArchive = false } = {}) {
    return {
        ...mission("river-crossing", mapName, maps),
        kind,
        source: "official",
        rootId: "official",
        compatibility,
        difficulties: ["Story"],
        defaultDifficulty: "Story",
        archivePath: withoutArchive ? undefined : "games/bar-scenario-river-crossing.sdz",
    } as unknown as SingleplayerScenario;
}

function campaign(missions: SingleplayerMission[], { compatibility = PLAYS_HERE, sharedMaps = [] as string[], startMission = ["first"], withoutArchive = false } = {}) {
    return {
        kind: "campaign",
        source: "official",
        rootId: "official",
        id: "sample",
        path: "sample",
        config: { titleKey: "sample.title", startMission },
        language: { en: { "sample.title": "Sample" } },
        compatibility,
        sharedMaps,
        missions,
        archivePath: withoutArchive ? undefined : "games/bar-campaign-sample.sdz",
    } as unknown as SingleplayerCampaign;
}

beforeEach(() => {
    mapsStore.availableMapNames = new Set([INSTALLED_MAP]);
    enginesStore.availableEngineVersions = [{ id: ENGINE, installed: true } as EngineVersion];
    gameStore.availableGameVersions = new Map([[GAME, {} as GameVersion]]);
    asEdition("steam", { engine: ENGINE, game: GAME });
});

describe("a scenario's or tutorial's map", () => {
    it("is playable when installed, or shipped in its own maps", () => {
        expect(singleplayerLogic.itemUnplayable(scenario(INSTALLED_MAP))).toBeUndefined();
        expect(singleplayerLogic.itemUnplayable(scenario(MISSING_MAP, { maps: [MISSING_MAP] }))).toBeUndefined();
    });

    it("can't be played when it is neither, where maps can't be downloaded", () => {
        expect(singleplayerLogic.itemUnplayable(scenario(MISSING_MAP))).toEqual({ map: MISSING_MAP });
        expect(singleplayerLogic.itemUnplayable(scenario(MISSING_MAP, { maps: ["Some Other Map 1.0"] }))).toEqual({ map: MISSING_MAP });
    });

    it("never stops anything on standalone, which downloads what it lacks", () => {
        asEdition("standalone");

        expect(singleplayerLogic.itemUnplayable(scenario(MISSING_MAP, { compatibility: PLAYS_ELSEWHERE }))).toBeUndefined();
    });
});

describe("an item's engine and game", () => {
    it("must include an installed engine with an installed game", () => {
        expect(singleplayerLogic.itemUnplayable(scenario(INSTALLED_MAP, { compatibility: PLAYS_ELSEWHERE }))).toEqual({ compatibility: `engine ${ENGINE} with game ${OTHER_GAME}` });
    });

    // The install's default pair is only what skirmish uses.
    it("may use any installed engine and game, not only the install's default pair", () => {
        enginesStore.availableEngineVersions = [{ id: ENGINE, installed: true } as EngineVersion, { id: "2025.06.01", installed: true } as EngineVersion];
        gameStore.availableGameVersions = new Map([
            [GAME, {} as GameVersion],
            [OTHER_GAME, {} as GameVersion],
        ]);

        expect(singleplayerLogic.itemUnplayable(scenario(INSTALLED_MAP, { compatibility: PLAYS_ELSEWHERE }))).toBeUndefined();
        expect(singleplayerLogic.itemUnplayable(scenario(INSTALLED_MAP, { compatibility: [{ engineVersion: "2025.06.01", gameVersions: [GAME] }] }))).toBeUndefined();
        expect(singleplayerLogic.itemUnplayable(scenario(INSTALLED_MAP, { compatibility: [{ engineVersion: "2099.01.01", gameVersions: [GAME] }] }))).toEqual({
            compatibility: `engine 2099.01.01 with game ${GAME}`,
        });
    });

    it("isn't checked for content still in development", () => {
        expect(singleplayerLogic.itemUnplayable(scenario(INSTALLED_MAP, { compatibility: "dev" as unknown as Compatibility }))).toBeUndefined();
    });

    it("is reported ahead of the map", () => {
        expect(singleplayerLogic.itemUnplayable(scenario(MISSING_MAP, { compatibility: PLAYS_ELSEWHERE }))).toEqual({ compatibility: expect.any(String) });
    });
});

describe("a campaign", () => {
    it("lets a mission use a map from the campaign's shared/maps or its own maps", () => {
        const fromShared = mission("first", MISSING_MAP);
        const fromOwn = mission("second", "Own Map 1.0", ["Own Map 1.0"]);
        const sample = campaign([fromShared, fromOwn], { sharedMaps: [MISSING_MAP] });

        expect(singleplayerLogic.missionUnplayable(sample, fromShared)).toBeUndefined();
        expect(singleplayerLogic.missionUnplayable(sample, fromOwn)).toBeUndefined();
    });

    // A mission's own maps are only its own.
    it("doesn't let a mission use another mission's maps", () => {
        const first = mission("first", INSTALLED_MAP, [MISSING_MAP]);
        const second = mission("second", MISSING_MAP);

        expect(singleplayerLogic.missionUnplayable(campaign([first, second]), second)).toEqual({ map: MISSING_MAP });
    });

    it("can't be played when none of its start missions can, though its other missions are only marked", () => {
        const first = mission("first", MISSING_MAP);
        const second = mission("second", INSTALLED_MAP);

        expect(singleplayerLogic.campaignUnplayable(campaign([first, second]))).toEqual({ startMissions: true });
        expect(singleplayerLogic.campaignUnplayable(campaign([first, second], { startMission: ["first", "second"] }))).toBeUndefined();
        expect(singleplayerLogic.missionUnplayable(campaign([first, second], { startMission: ["first", "second"] }), first)).toEqual({ map: MISSING_MAP });
    });

    it("can't be played, nor can any mission, without its engine and game", () => {
        const first = mission("first", INSTALLED_MAP);
        const sample = campaign([first], { compatibility: PLAYS_ELSEWHERE });

        expect(singleplayerLogic.campaignUnplayable(sample)).toEqual({ compatibility: `engine ${ENGINE} with game ${OTHER_GAME}` });
        expect(singleplayerLogic.missionUnplayable(sample, first)).toEqual({ compatibility: `engine ${ENGINE} with game ${OTHER_GAME}` });
    });
});

describe("a mission archive", () => {
    it("is needed to play a scenario or tutorial, after its engine and game", () => {
        expect(singleplayerLogic.itemUnplayable(scenario(MISSING_MAP, { withoutArchive: true }))).toEqual({ noArchive: true });
        expect(singleplayerLogic.itemUnplayable(scenario(INSTALLED_MAP, { withoutArchive: true, compatibility: PLAYS_ELSEWHERE }))).toEqual({ compatibility: expect.any(String) });
    });

    // A campaign's one archive holds every mission's Lua.
    it("is needed to play a campaign and every mission in it", () => {
        const first = mission("first", INSTALLED_MAP);
        const sample = campaign([first], { withoutArchive: true });

        expect(singleplayerLogic.campaignUnplayable(sample)).toEqual({ noArchive: true });
        expect(singleplayerLogic.missionUnplayable(sample, first)).toEqual({ noArchive: true });
    });
});

describe("the reason's wording", () => {
    it.each([
        [{ map: MISSING_MAP }, `Unavailable: needs map "${MISSING_MAP}", which is not installed.`],
        [{ compatibility: `engine ${ENGINE} with game ${OTHER_GAME}` }, `Unavailable: needs engine ${ENGINE} with game ${OTHER_GAME}, which this install does not have.`],
        [{ noArchive: true } as const, "Unavailable: has no mission archive."],
        [{ startMissions: true } as const, "Unavailable: none of its start missions can be played."],
    ])("words %o", (reason, text) => {
        const { key, params } = singleplayerLogic.unplayableText(reason);

        expect(t(key, params)).toBe(text);
    });
});

describe("the log", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const load = (scenarios: SingleplayerScenario[], campaigns: SingleplayerCampaign[] = []) => singleplayerActions.loaded({ campaigns, scenarios, tutorials: [], problems: [] });

    beforeEach(() => {
        initSingleplayerLogic();
        warn.mockClear();
    });
    afterEach(() => singleplayerActions.clear());

    it("logs each item that can't be played once per content load, naming what it needs", async () => {
        const first = mission("first", MISSING_MAP);
        load([scenario(MISSING_MAP), scenario(INSTALLED_MAP, { kind: "tutorial", compatibility: PLAYS_ELSEWHERE })], [campaign([first, mission("second", MISSING_MAP)])]);
        await nextTick();

        expect(warn.mock.calls.map(([line]) => line)).toEqual([
            `Campaign unavailable: sample "Sample" has no start mission that can be played`,
            `Campaign mission unavailable: sample/first "Mission first" needs map "${MISSING_MAP}", which is not installed`,
            `Campaign mission unavailable: sample/second "Mission second" needs map "${MISSING_MAP}", which is not installed`,
            `Scenario unavailable: river-crossing "Mission river-crossing" needs map "${MISSING_MAP}", which is not installed`,
            `Tutorial unavailable: river-crossing "Mission river-crossing" needs engine ${ENGINE} with game ${OTHER_GAME}, which this install does not have`,
        ]);

        mapsStore.availableMapNames = new Set([INSTALLED_MAP, "Unrelated 1.0"]);
        await nextTick();
        expect(warn).toHaveBeenCalledTimes(5);

        load([scenario(MISSING_MAP)]);
        await nextTick();
        expect(warn).toHaveBeenCalledTimes(6);
    });

    // The installed maps can arrive after the content.
    it("logs an item once it can't be played, not only when the content arrives", async () => {
        mapsStore.availableMapNames = new Set([MISSING_MAP]);
        load([scenario(MISSING_MAP)]);
        await nextTick();
        expect(warn).not.toHaveBeenCalled();

        mapsStore.availableMapNames = new Set();
        await nextTick();
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it("logs one line for a campaign without its archive, rather than one per mission", async () => {
        load([], [campaign([mission("first", MISSING_MAP)], { withoutArchive: true })]);
        await nextTick();

        expect(warn.mock.calls.map(([line]) => line)).toEqual([`Campaign unavailable: sample "Sample" has no mission archive`]);
    });

    it("logs one line for a campaign without its engine and game, rather than one per mission", async () => {
        load([], [campaign([mission("first", MISSING_MAP)], { compatibility: PLAYS_ELSEWHERE })]);
        await nextTick();

        expect(warn.mock.calls.map(([line]) => line)).toEqual([`Campaign unavailable: sample "Sample" needs engine ${ENGINE} with game ${OTHER_GAME}, which this install does not have`]);
    });
});
