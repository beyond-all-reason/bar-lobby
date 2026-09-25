// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { StartPosType } from "@main/game/battle/battle-types";
import { MapData } from "@main/content/maps/map-data";
import { createLobbySettingsDraft, useLobbySettingsDraft } from "@renderer/composables/useLobbySettingsDraft";
import { Lobby } from "@renderer/model/lobby";
import { getCurrentArrangement, getCurrentStartBoxes, withStartboxOverride } from "@renderer/utils/battle-map-options";
import { decodeModoptionValue, rectsToArrangement } from "@shared/startbox-modoptions";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reactive, toRaw } from "vue";

const map = { springName: "Test Map" } as MapData;
const boxes = [
    { top: 0, bottom: 1, left: 0, right: 0.25 },
    { top: 0, bottom: 1, left: 0.75, right: 1 },
];
const mapOptions = { startPosType: StartPosType.Boxes, startBoxesIndex: undefined };

function createLobby(mapName = "Test Map") {
    return {
        id: "lobby-1",
        name: "Existing Lobby",
        mapName,
        engineVersion: "test-engine",
        gameVersion: "test-game",
        gameOptions: {},
        allyTeamConfig: {
            "0": { maxTeams: 1, startBox: boxes[0], teams: { "0": { maxPlayers: 1 } } },
            "1": { maxTeams: 1, startBox: boxes[1], teams: { "0": { maxPlayers: 1 } } },
        },
        areBossesEnabled: false,
        bosses: {},
        players: {},
        spectators: {},
        bots: {},
        maxPlayerCount: 2,
        playerCount: 0,
        spectatorCount: 0,
        playerQueue: new Map<number, string>(),
        botCount: 0,
    } satisfies Lobby;
}

function expectBoxesInSync(settingsDraft: ReturnType<typeof useLobbySettingsDraft>) {
    const currentDraft = settingsDraft.draft.value;
    expect(currentDraft).toBeDefined();
    expect(getCurrentStartBoxes(currentDraft?.map, currentDraft!.mapOptions)).toEqual(currentDraft!.allyTeamConfig.map((allyTeam) => allyTeam.startBox));
}

describe("useLobbySettingsDraft", () => {
    afterEach(() => vi.restoreAllMocks());

    it("creates an isolated complete create payload", async () => {
        const initial = createLobbySettingsDraft("New Lobby", map, mapOptions, 2, 1, boxes);
        const draft = useLobbySettingsDraft();

        draft.openCreate(initial);
        initial.name = "Changed outside draft";

        expect(await draft.createPayload()).toEqual({
            name: "New Lobby",
            mapName: "Test Map",
            areBossesEnabled: false,
            allyTeamConfig: [
                { maxTeams: 1, startBox: boxes[0], teams: [{ maxPlayers: 1 }] },
                { maxTeams: 1, startBox: boxes[1], teams: [{ maxPlayers: 1 }] },
            ],
            gameOptions: { mapmetadata_startbox_override: { value: expect.any(String) } },
        });
        expectBoxesInSync(draft);
    });

    it("creates a dirty-only update payload", async () => {
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), map);
        draft.updateDraft({ name: "Renamed Lobby" });

        expect(await draft.updatePayload()).toEqual({ name: "Renamed Lobby" });
        expect(draft.dirtyFields.value).toEqual(new Set(["name"]));
    });

    it("creates no update payload when the draft is unchanged", async () => {
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), map);

        expect(draft.dirtyFields.value).toEqual(new Set());
        expect(await draft.updatePayload()).toEqual({});
    });

    it("includes map and ally-team changes in the same update payload, leaving start box options to the map change", async () => {
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), map);
        draft.setMap({ springName: "Updated Map" } as MapData);
        draft.setTeamCounts(3, 1);

        const payload = await draft.updatePayload();

        expect(payload.mapName).toBe("Updated Map");
        expect(payload.allyTeamConfig).toHaveLength(3);
        expect(payload.gameOptions).toBeUndefined();
        expect(draft.dirtyFields.value).toEqual(new Set(["mapName", "allyTeamConfig"]));
    });

    it("purges the session state", () => {
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), map);
        draft.purge();

        expect(draft.draft.value).toBeUndefined();
        expect(draft.base.value).toBeUndefined();
        expect(draft.dirtyFields.value.size).toBe(0);
    });

    it("preserves a local edit and reports a same-field server conflict", () => {
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), map);
        draft.updateDraft({ name: "Local Name" });

        const server = { ...draft.base.value!, name: "Server Name" };
        draft.syncFromServer(server);

        expect(draft.conflicts).toHaveLength(1);
        expect(draft.draft.value?.name).toBe("Local Name");
        expect(draft.base.value?.name).toBe("Server Name");

        draft.useServer("name");
        expect(draft.draft.value?.name).toBe("Server Name");
        expect(draft.conflicts).toHaveLength(0);
    });

    it("applies the server map when resolving a map-name conflict", () => {
        const draft = useLobbySettingsDraft();
        const localMap = { springName: "Local Map" } as MapData;
        const serverMap = { springName: "Server Map" } as MapData;
        draft.openUpdate(createLobby(), map);
        draft.setMap(localMap);

        draft.syncFromLobby(createLobby("Server Map"), serverMap);
        draft.useServer("mapName");

        expect(draft.draft.value?.mapName).toBe("Server Map");
        expect(draft.draft.value?.map).toEqual(serverMap);
        expect(draft.conflicts.some((conflict) => conflict.field === "mapName")).toBe(false);
        expectBoxesInSync(draft);
    });

    it("rebases clean server updates without creating conflicts", () => {
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), map);

        const server = { ...draft.base.value!, name: "Server Name" };
        draft.syncFromServer(server);
        draft.syncFromServer({ ...server, name: "Server Name 2" });

        expect(draft.draft.value?.name).toBe("Server Name 2");
        expect(draft.conflicts).toHaveLength(0);
    });

    it("does not duplicate a conflict when the same server update repeats", () => {
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), map);
        draft.updateDraft({ name: "Local Name" });

        const server = { ...draft.base.value!, name: "Server Name" };
        draft.syncFromServer(server);
        draft.syncFromServer(server);

        expect(draft.conflicts).toHaveLength(1);
    });

    it("clones reactive map options without throwing", () => {
        const draft = useLobbySettingsDraft();
        draft.openCreate(createLobbySettingsDraft("New Lobby", map, mapOptions, 2, 1, boxes));

        const reactiveMapOptions = reactive({
            ...mapOptions,
            customStartBoxes: boxes,
        });

        expect(() => draft.setMapOptions(reactiveMapOptions)).not.toThrow();
        expect(draft.draft.value?.mapOptions.customStartBoxes).toEqual(boxes);
    });

    it("updates preview and payload boxes atomically for custom edits", async () => {
        const draft = useLobbySettingsDraft();
        draft.openCreate(createLobbySettingsDraft("New Lobby", map, mapOptions, 2, 1, boxes));
        const editedBoxes = [
            { ...boxes[0], right: 0.4 },
            { ...boxes[1], left: 0.6 },
        ];

        draft.setCustomStartBoxes(editedBoxes);

        expectBoxesInSync(draft);
        expect((await draft.createPayload()).allyTeamConfig.map((allyTeam) => allyTeam.startBox)).toEqual(editedBoxes);
    });

    it("preserves a map preview Blob when opening a create draft", () => {
        const preview = new Blob(["preview"], { type: "image/webp" });
        const draft = useLobbySettingsDraft();
        const mapWithPreview = { springName: "Test Map", images: { preview: "preview" }, imagesBlob: { preview } } as MapData;

        draft.openCreate(createLobbySettingsDraft("New Lobby", mapWithPreview, mapOptions, 2, 1, boxes));

        const clonedPreview = draft.draft.value?.map?.imagesBlob?.preview;
        expect(clonedPreview).toBeDefined();
        expect(toRaw(clonedPreview)).toBe(preview);
    });

    it("adds a visible custom start box when the team count grows", () => {
        const draft = useLobbySettingsDraft();
        draft.openCreate(createLobbySettingsDraft("New Lobby", map, { ...mapOptions, customStartBoxes: boxes }, 2, 1, boxes));
        vi.spyOn(Math, "random").mockReturnValue(0);

        draft.setTeamCounts(3, 1);

        const customStartBoxes = draft.draft.value?.mapOptions.customStartBoxes;
        const previousBox = customStartBoxes?.[1];
        const addedBox = customStartBoxes?.[2];
        expect(customStartBoxes).toHaveLength(3);
        expect(addedBox).not.toEqual(previousBox);
        expect(addedBox!.right - addedBox!.left).toBeCloseTo(previousBox!.right - previousBox!.left);
        expect(addedBox!.bottom - addedBox!.top).toBeCloseTo(previousBox!.bottom - previousBox!.top);
        expect(Math.min(addedBox!.top, addedBox!.left)).toBeGreaterThanOrEqual(0);
        expect(Math.max(addedBox!.bottom, addedBox!.right)).toBeLessThanOrEqual(1);
        expect(draft.draft.value?.allyTeamConfig).toHaveLength(3);
        expectBoxesInSync(draft);
    });

    it("sizes ally teams from a selected preset's startbox count", () => {
        const presetMap = {
            springName: "Preset Map",
            startboxesSet: [
                {
                    maxPlayersPerStartbox: 1,
                    startboxes: [
                        {
                            poly: [
                                { x: 0, y: 0 },
                                { x: 40, y: 200 },
                            ],
                        },
                        {
                            poly: [
                                { x: 80, y: 0 },
                                { x: 120, y: 200 },
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
            ],
        } as MapData;
        const draft = useLobbySettingsDraft();
        draft.openCreate(createLobbySettingsDraft("Preset Lobby", presetMap, { startPosType: StartPosType.Boxes, startBoxesIndex: 0 }, 2, 1, boxes));

        draft.setTeamCounts(3, 1);

        expect(draft.draft.value?.allyTeamConfig).toHaveLength(3);
        expectBoxesInSync(draft);
    });

    it("synchronizes ally teams when selecting a preset", () => {
        const presetMap = {
            springName: "Preset Map",
            startboxesSet: [
                {
                    maxPlayersPerStartbox: 1,
                    startboxes: [
                        {
                            poly: [
                                { x: 0, y: 0 },
                                { x: 50, y: 200 },
                            ],
                        },
                        {
                            poly: [
                                { x: 150, y: 0 },
                                { x: 200, y: 200 },
                            ],
                        },
                    ],
                },
            ],
        } as MapData;
        const draft = useLobbySettingsDraft();
        draft.openCreate(createLobbySettingsDraft("Preset Lobby", presetMap, mapOptions, 2, 1, boxes));

        draft.setMapOptions({ startPosType: StartPosType.Boxes, startBoxesIndex: 0 });

        expect(draft.draft.value?.mapOptions.startBoxesIndex).toBe(0);
        expectBoxesInSync(draft);
    });

    it("materializes an initial preset when its box count differs from the requested team count", () => {
        const presetMap = {
            springName: "Large Preset Map",
            startboxesSet: [
                {
                    maxPlayersPerStartbox: 1,
                    startboxes: [
                        {
                            poly: [
                                { x: 0, y: 0 },
                                { x: 40, y: 200 },
                            ],
                        },
                        {
                            poly: [
                                { x: 50, y: 0 },
                                { x: 90, y: 200 },
                            ],
                        },
                        {
                            poly: [
                                { x: 110, y: 0 },
                                { x: 150, y: 200 },
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
            ],
        } as MapData;
        const presetOptions = { startPosType: StartPosType.Boxes, startBoxesIndex: 0 };
        const presetBoxes = getCurrentStartBoxes(presetMap, presetOptions);
        const draft = useLobbySettingsDraft();

        draft.openCreate(createLobbySettingsDraft("Two Team Lobby", presetMap, presetOptions, 2, 1, presetBoxes));

        expect(draft.draft.value?.mapOptions.startBoxesIndex).toBeUndefined();
        expect(draft.draft.value?.mapOptions.customStartBoxes).toHaveLength(2);
        expectBoxesInSync(draft);
    });

    it("replaces old boxes when the map changes", () => {
        const nextMap = {
            springName: "Next Map",
            startboxesSet: [
                {
                    maxPlayersPerStartbox: 1,
                    startboxes: [
                        {
                            poly: [
                                { x: 0, y: 0 },
                                { x: 80, y: 80 },
                            ],
                        },
                        {
                            poly: [
                                { x: 120, y: 120 },
                                { x: 200, y: 200 },
                            ],
                        },
                    ],
                },
            ],
        } as MapData;
        const draft = useLobbySettingsDraft();
        draft.openCreate(createLobbySettingsDraft("New Lobby", map, mapOptions, 2, 1, boxes));

        draft.setMap(nextMap);

        expect(draft.draft.value?.mapName).toBe("Next Map");
        expect(draft.draft.value?.allyTeamConfig.map((allyTeam) => allyTeam.startBox)).not.toEqual(boxes);
        expectBoxesInSync(draft);
    });

    it("updates preview boxes after accepting a clean server team update", () => {
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), map);
        const serverBoxes = [
            { ...boxes[0], right: 0.35 },
            { ...boxes[1], left: 0.65 },
        ];
        const serverLobby = createLobby();
        serverLobby.allyTeamConfig["0"].startBox = serverBoxes[0];
        serverLobby.allyTeamConfig["1"].startBox = serverBoxes[1];

        draft.syncFromLobby(serverLobby, map);

        expectBoxesInSync(draft);
        expect(draft.draft.value?.mapOptions.customStartBoxes).toEqual(serverBoxes);
    });

    it("updates preview boxes when resolving a team conflict with the server", () => {
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), map);
        draft.setCustomStartBoxes([{ ...boxes[0], right: 0.4 }, boxes[1]]);
        const serverLobby = createLobby();
        serverLobby.allyTeamConfig["0"].startBox = { ...boxes[0], right: 0.3 };
        draft.syncFromLobby(serverLobby, map);

        draft.useServer("allyTeamConfig");

        expectBoxesInSync(draft);
        expect(draft.draft.value?.allyTeamConfig.map((allyTeam) => allyTeam.startBox)).toEqual([{ ...boxes[0], right: 0.3 }, boxes[1]]);
    });

    it("preserves a non-box start mode during unrelated server updates", () => {
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), map);
        draft.setMapOptions({ startPosType: StartPosType.Fixed, fixedPositionsIndex: 0 });

        draft.syncFromServer({ ...draft.base.value!, name: "Server Name" });

        expect(draft.draft.value?.mapOptions.startPosType).toBe(StartPosType.Fixed);
    });

    it("reopens a lobby's polygon override as its shapes rather than their bounding rects", () => {
        const shapes = [
            [
                { x: 0, y: 0 },
                { x: 60, y: 0 },
                { x: 30, y: 60, strength: 1 },
            ],
            [
                { x: 140, y: 200 },
                { x: 200, y: 200 },
                { x: 170, y: 140 },
            ],
        ];
        const lobby: Lobby = createLobby();
        lobby.startboxes = { override: { startboxes: shapes.map((poly) => ({ poly })) } };
        const draft = useLobbySettingsDraft();

        draft.openUpdate(lobby, map);

        expect(getCurrentArrangement(map, draft.draft.value!.mapOptions)?.startboxes.map((box) => box.poly)).toEqual(shapes);
        expect(draft.dirtyFields.value.size).toBe(0);
    });

    it("reopens a lobby on the map's set as the preset for its team count", () => {
        const arrangement = rectsToArrangement(boxes);
        const presetMap = { springName: "Test Map", startboxesSet: [{ maxPlayersPerStartbox: 1, ...arrangement }] } as MapData;
        const lobby: Lobby = createLobby();
        lobby.startboxes = { set: { "2": arrangement } };
        const draft = useLobbySettingsDraft();

        draft.openUpdate(lobby, presetMap);

        expect(draft.draft.value?.mapOptions.startBoxesIndex).toBe(0);
    });

    it("keeps the other ally teams' shapes when an ally team is removed", () => {
        const triangle = (x: number) => [
            { x, y: 0 },
            { x: x + 40, y: 0 },
            { x: x + 20, y: 60 },
        ];
        const shapes = [triangle(0), triangle(80), triangle(160)];
        const draft = useLobbySettingsDraft();
        draft.openCreate(createLobbySettingsDraft("New Lobby", map, mapOptions, 2, 1, boxes));
        draft.setMapOptions(withStartboxOverride(draft.draft.value!.mapOptions, { startboxes: shapes.map((poly) => ({ poly })) }));

        draft.removeAllyTeam(1);

        expect(getCurrentArrangement(map, draft.draft.value!.mapOptions)?.startboxes.map((box) => box.poly)).toEqual([shapes[0], shapes[2]]);
        expectBoxesInSync(draft);
    });

    it("keeps the lobby's custom boxes when Random is picked, which online battles ignore", () => {
        const lobby: Lobby = createLobby();
        lobby.startboxes = { override: rectsToArrangement(boxes) };
        const draft = useLobbySettingsDraft();
        draft.openUpdate(lobby, map);

        draft.setMapOptions({ ...draft.draft.value!.mapOptions, startPosType: StartPosType.Random });

        expect(draft.dirtyFields.value.size).toBe(0);
    });

    it("sends custom boxes as the override and clears it again for a preset", async () => {
        const presetMap = { springName: "Test Map", startboxesSet: [{ maxPlayersPerStartbox: 1, ...rectsToArrangement(boxes) }] } as MapData;
        const editedBoxes = [{ ...boxes[0], right: 0.4 }, boxes[1]];
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), presetMap);

        draft.setCustomStartBoxes(editedBoxes);
        const custom = await draft.updatePayload();

        expect(await decodeModoptionValue(custom.gameOptions?.mapmetadata_startbox_override?.value)).toEqual(rectsToArrangement(editedBoxes));
        expect(custom.gameOptions?.mapmetadata_startboxes_set).toEqual({ value: expect.any(String) });

        draft.setMapOptions({ startPosType: StartPosType.Boxes, startBoxesIndex: 0 });
        const preset = await draft.updatePayload();

        expect(preset.gameOptions?.mapmetadata_startbox_override).toBeNull();
    });
});
