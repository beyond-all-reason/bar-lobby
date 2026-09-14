// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { StartPosType } from "@main/game/battle/battle-types";
import { createLobbySettingsDraft, useLobbySettingsDraft } from "@renderer/composables/useLobbySettingsDraft";
import { describe, expect, it } from "vitest";
import { reactive, toRaw } from "vue";

const map = { springName: "Test Map" } as never;
const boxes = [
    { top: 0, bottom: 1, left: 0, right: 0.25 },
    { top: 0, bottom: 1, left: 0.75, right: 1 },
];
const mapOptions = { startPosType: StartPosType.Boxes, startBoxesIndex: undefined };

function createLobby() {
    return {
        id: "lobby-1",
        name: "Existing Lobby",
        mapName: "Test Map",
        allyTeamConfig: {
            "0": { maxTeams: 1, startBox: boxes[0], teams: { "0": { maxPlayers: 1 } } },
            "1": { maxTeams: 1, startBox: boxes[1], teams: { "0": { maxPlayers: 1 } } },
        },
    } as never;
}

describe("useLobbySettingsDraft", () => {
    it("creates an isolated complete create payload", () => {
        const initial = createLobbySettingsDraft("New Lobby", map, mapOptions, 2, 1, boxes);
        const draft = useLobbySettingsDraft();

        draft.openCreate(initial);
        initial.name = "Changed outside draft";

        expect(draft.createPayload()).toEqual({
            name: "New Lobby",
            mapName: "Test Map",
            areBossesEnabled: false,
            allyTeamConfig: [
                { maxTeams: 1, startBox: boxes[0], teams: [{ maxPlayers: 1 }] },
                { maxTeams: 1, startBox: boxes[1], teams: [{ maxPlayers: 1 }] },
            ],
        });
    });

    it("creates a dirty-only update payload", () => {
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), map);
        draft.updateDraft({ name: "Renamed Lobby" });

        expect(draft.updatePayload()).toEqual({ name: "Renamed Lobby" });
        expect(draft.dirtyFields.value).toEqual(new Set(["name"]));
    });

    it("creates no update payload when the draft is unchanged", () => {
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), map);

        expect(draft.dirtyFields.value).toEqual(new Set());
        expect(draft.updatePayload()).toEqual({});
    });

    it("includes map and ally-team changes in the same update payload", () => {
        const draft = useLobbySettingsDraft();
        draft.openUpdate(createLobby(), map);
        draft.setMap({ springName: "Updated Map" } as never);
        draft.setTeamCounts(3, 1);

        const payload = draft.updatePayload();

        expect(payload.mapName).toBe("Updated Map");
        expect(payload.allyTeamConfig).toHaveLength(3);
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

        expect(() => draft.updateDraft({ mapOptions: reactiveMapOptions })).not.toThrow();
        expect(draft.draft.value?.mapOptions.customStartBoxes).toEqual(boxes);
    });

    it("preserves a map preview Blob when opening a create draft", () => {
        const preview = new Blob(["preview"], { type: "image/webp" });
        const draft = useLobbySettingsDraft();
        const mapWithPreview = { springName: "Test Map", images: { preview: "preview" }, imagesBlob: { preview } } as never;

        draft.openCreate(createLobbySettingsDraft("New Lobby", mapWithPreview, mapOptions, 2, 1, boxes));

        const clonedPreview = draft.draft.value?.map?.imagesBlob?.preview;
        expect(clonedPreview).toBeDefined();
        expect(toRaw(clonedPreview)).toBe(preview);
    });

    it("adds a visible custom start box when the team count grows", () => {
        const draft = useLobbySettingsDraft();
        draft.openCreate(createLobbySettingsDraft("New Lobby", map, { ...mapOptions, customStartBoxes: boxes }, 2, 1, boxes));

        draft.setTeamCounts(3, 1);

        expect(draft.draft.value?.mapOptions.customStartBoxes).toHaveLength(3);
        expect(draft.draft.value?.allyTeamConfig).toHaveLength(3);
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
        } as never;
        const draft = useLobbySettingsDraft();
        draft.openCreate(createLobbySettingsDraft("Preset Lobby", presetMap, { startPosType: StartPosType.Boxes, startBoxesIndex: 0 }, 2, 1, boxes));

        draft.setTeamCounts(3, 1);

        expect(draft.draft.value?.allyTeamConfig).toHaveLength(3);
    });
});
