// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { BattleOptions, StartPosType } from "@main/game/battle/battle-types";
import { MapData } from "@main/content/maps/map-data";
import { Lobby } from "@renderer/model/lobby";
import { LobbyCreateRequestData, LobbyUpdateRequestData, StartBox } from "tachyon-protocol/types";
import { computed, isProxy, reactive, ref, toRaw } from "vue";
import { eastVsWestStartBoxes, getCurrentStartBoxes } from "@renderer/utils/battle-map-options";

export type LobbyDraftMode = "create" | "update";

type AllyTeam = LobbyCreateRequestData["allyTeamConfig"][number];

export interface LobbySettingsDraft {
    name: string;
    map?: MapData;
    mapName: string;
    mapOptions: BattleOptions["mapOptions"];
    allyTeamConfig: AllyTeam[];
    areBossesEnabled?: boolean;
}

type LobbySettingsDraftUpdate = Partial<Pick<LobbySettingsDraft, "name" | "areBossesEnabled">>;

export type LobbyDraftField = "name" | "mapName" | "allyTeamConfig";

export type LobbyDraftConflict =
    | { field: "name"; base: string; draft: string; server: string }
    | { field: "mapName"; base: string; draft: string; server: string; serverMap?: MapData }
    | { field: "allyTeamConfig"; base: AllyTeam[]; draft: AllyTeam[]; server: AllyTeam[] };

function isBlobLike(value: unknown): value is Blob {
    if (value === null || typeof value !== "object") return false;
    if (Object.prototype.toString.call(value) === "[object Blob]") return true;
    if (value.constructor?.name === "Blob") return true;
    return "size" in value && typeof value.size === "number" && "type" in value && typeof value.type === "string" && "slice" in value && typeof value.slice === "function";
}

function cloneValue(value: unknown): unknown {
    const rawValue = isProxy(value) ? toRaw(value) : value;
    if (isBlobLike(rawValue)) return rawValue;
    if (Array.isArray(rawValue)) return rawValue.map(cloneValue);
    if (rawValue && typeof rawValue === "object") {
        return Object.fromEntries(Object.entries(rawValue).map(([key, nestedValue]) => [key, cloneValue(nestedValue)]));
    }
    return rawValue;
}

function clone<T>(value: T): T {
    return cloneValue(value) as T;
}

function configRecordToArray(config: Lobby["allyTeamConfig"]): AllyTeam[] {
    return Object.keys(config)
        .sort((a, b) => Number(a) - Number(b))
        .map((allyTeam) => {
            const value = config[allyTeam];
            return {
                maxTeams: value.maxTeams,
                startBox: clone(value.startBox),
                teams: Object.keys(value.teams)
                    .sort((a, b) => Number(a) - Number(b))
                    .map((team) => ({ maxPlayers: value.teams[team].maxPlayers })),
            };
        });
}

function arrayToConfigRecord(config: AllyTeam[]): AllyTeam[] {
    return clone(config);
}

function copyField(target: LobbySettingsDraft, field: LobbyDraftField, source: LobbySettingsDraft) {
    switch (field) {
        case "name":
            target.name = source.name;
            break;
        case "mapName":
            target.mapName = source.mapName;
            break;
        case "allyTeamConfig":
            target.allyTeamConfig = clone(source.allyTeamConfig);
            break;
    }
}

function makeConflict(field: LobbyDraftField, base: LobbySettingsDraft, draft: LobbySettingsDraft, server: LobbySettingsDraft): LobbyDraftConflict {
    switch (field) {
        case "name":
            return { field, base: base.name, draft: draft.name, server: server.name };
        case "mapName":
            return { field, base: base.mapName, draft: draft.mapName, server: server.mapName, serverMap: server.map };
        case "allyTeamConfig":
            return {
                field,
                base: clone(base.allyTeamConfig),
                draft: clone(draft.allyTeamConfig),
                server: clone(server.allyTeamConfig),
            };
    }
}

function createDefaultConfig(allyTeamCount: number, playersPerAllyTeam: number, boxes: StartBox[]): AllyTeam[] {
    return Array.from({ length: allyTeamCount }, (_, allyTeamIndex) => ({
        maxTeams: playersPerAllyTeam,
        startBox: clone(boxes[allyTeamIndex] ?? { top: 0, bottom: 1, left: 0, right: 1 }),
        teams: Array.from({ length: playersPerAllyTeam }, () => ({ maxPlayers: 1 })),
    }));
}

function randomBoundedOffset(negativeRoom: number, positiveRoom: number): number {
    const maxJitter = 0.05;
    const negativeLimit = Math.min(negativeRoom, maxJitter);
    const positiveLimit = Math.min(positiveRoom, maxJitter);
    if (negativeLimit === 0 && positiveLimit === 0) return 0;

    const usePositive = positiveLimit > 0 && (negativeLimit === 0 || Math.random() >= 0.5);
    const limit = usePositive ? positiveLimit : negativeLimit;
    const magnitude = limit * (0.4 + Math.random() * 0.6);
    return usePositive ? magnitude : -magnitude;
}

function jitterBox(box: StartBox): StartBox {
    const horizontalOffset = randomBoundedOffset(box.left, 1 - box.right);
    const verticalOffset = randomBoundedOffset(box.top, 1 - box.bottom);
    return {
        top: box.top + verticalOffset,
        bottom: box.bottom + verticalOffset,
        left: box.left + horizontalOffset,
        right: box.right + horizontalOffset,
    };
}

function resizeBoxes(boxes: StartBox[], count: number): StartBox[] {
    const fallback = boxes.at(-1) ?? { top: 0, bottom: 1, left: 0, right: 1 };
    return Array.from({ length: count }, (_, index) => clone(boxes[index] ?? jitterBox(fallback)));
}

function boxesFromConfig(config: AllyTeam[]): StartBox[] {
    return config.map((allyTeam) => clone(allyTeam.startBox));
}

export function createDraftFromLobby(lobby: Lobby, map: MapData | undefined): LobbySettingsDraft {
    const allyTeamConfig = configRecordToArray(lobby.allyTeamConfig);
    return {
        name: lobby.name,
        map,
        mapName: lobby.mapName,
        mapOptions: {
            startPosType: StartPosType.Boxes,
            customStartBoxes: allyTeamConfig.map((allyTeam) => clone(allyTeam.startBox)),
        },
        allyTeamConfig,
    };
}

export function createLobbySettingsDraft(
    name: string,
    map: MapData | undefined,
    mapOptions: BattleOptions["mapOptions"],
    allyTeamCount: number,
    playersPerAllyTeam: number,
    boxes: StartBox[],
    areBossesEnabled = false
): LobbySettingsDraft {
    const normalizedMapOptions = clone(mapOptions);
    if (normalizedMapOptions.startPosType === StartPosType.Boxes && normalizedMapOptions.startBoxesIndex === undefined) {
        normalizedMapOptions.customStartBoxes = clone(boxes);
    }
    return {
        name,
        map,
        mapName: map?.springName ?? "",
        mapOptions: normalizedMapOptions,
        allyTeamConfig: createDefaultConfig(allyTeamCount, playersPerAllyTeam, boxes),
        areBossesEnabled,
    };
}

export function useLobbySettingsDraft() {
    const mode = ref<LobbyDraftMode>("create");
    const base = ref<LobbySettingsDraft>();
    const draft = ref<LobbySettingsDraft>();
    const conflicts = reactive<LobbyDraftConflict[]>([]);

    const dirtyFields = computed<Set<LobbyDraftField>>(() => {
        if (!base.value || !draft.value) return new Set();
        const dirty = new Set<LobbyDraftField>();
        if (base.value.name !== draft.value.name) dirty.add("name");
        if (base.value.mapName !== draft.value.mapName) dirty.add("mapName");
        if (JSON.stringify(base.value.allyTeamConfig) !== JSON.stringify(draft.value.allyTeamConfig)) dirty.add("allyTeamConfig");
        return dirty;
    });

    function openCreate(initialDraft: LobbySettingsDraft) {
        mode.value = "create";
        base.value = undefined;
        draft.value = clone(initialDraft);
        setTeamCounts(initialDraft.allyTeamConfig.length, initialDraft.allyTeamConfig[0]?.maxTeams ?? 1);
        conflicts.splice(0);
    }

    function openUpdate(lobby: Lobby, map: MapData | undefined) {
        mode.value = "update";
        const initialDraft = createDraftFromLobby(lobby, map);
        base.value = clone(initialDraft);
        draft.value = clone(initialDraft);
        conflicts.splice(0);
    }

    function purge() {
        base.value = undefined;
        draft.value = undefined;
        conflicts.splice(0);
    }

    function updateDraft(update: LobbySettingsDraftUpdate) {
        if (!draft.value) return;
        Object.assign(draft.value, clone(update));
    }

    function applyBoxes(boxes: StartBox[]) {
        if (!draft.value) return;
        draft.value.allyTeamConfig = draft.value.allyTeamConfig.map((allyTeam, index) => ({
            ...allyTeam,
            startBox: clone(boxes[index] ?? allyTeam.startBox),
        }));
    }

    function syncPreviewFromConfig() {
        if (!draft.value) return;
        draft.value.mapOptions = {
            ...draft.value.mapOptions,
            startPosType: StartPosType.Boxes,
            startBoxesIndex: undefined,
            customStartBoxes: boxesFromConfig(draft.value.allyTeamConfig),
        };
    }

    function setMapOptions(mapOptions: BattleOptions["mapOptions"]) {
        if (!draft.value) return;
        draft.value.mapOptions = clone(mapOptions);
        if (mapOptions.startPosType !== StartPosType.Boxes) return;

        const boxes = getCurrentStartBoxes(draft.value.map, draft.value.mapOptions);
        if (boxes.length !== draft.value.allyTeamConfig.length) {
            setTeamCounts(boxes.length, draft.value.allyTeamConfig[0]?.maxTeams ?? 1);
            return;
        }
        applyBoxes(boxes);
    }

    function setCustomStartBoxes(boxes: StartBox[]) {
        if (!draft.value) return;
        setMapOptions({
            ...draft.value.mapOptions,
            startPosType: StartPosType.Boxes,
            startBoxesIndex: undefined,
            customStartBoxes: clone(boxes),
        });
    }

    function setMap(map: MapData) {
        if (!draft.value) return;
        draft.value.map = map;
        draft.value.mapName = map.springName;
        const currentPreset = draft.value.mapOptions.startBoxesIndex;
        if (currentPreset !== undefined && map.startboxesSet?.[currentPreset]) {
            draft.value.mapOptions.startPosType = StartPosType.Boxes;
        } else if (map.startboxesSet?.length) {
            draft.value.mapOptions = {
                ...draft.value.mapOptions,
                startPosType: StartPosType.Boxes,
                startBoxesIndex: 0,
            };
        } else {
            draft.value.mapOptions = {
                ...draft.value.mapOptions,
                startPosType: StartPosType.Boxes,
                startBoxesIndex: undefined,
                customStartBoxes: eastVsWestStartBoxes(),
            };
        }
        setTeamCounts(draft.value.allyTeamConfig.length, draft.value.allyTeamConfig[0]?.maxTeams ?? 1);
    }

    function setTeamCounts(allyTeamCount: number, playersPerAllyTeam: number) {
        if (!draft.value) return;
        const boxes = getCurrentStartBoxes(draft.value.map, draft.value.mapOptions);
        const nextBoxes = resizeBoxes(boxes, allyTeamCount);
        draft.value.allyTeamConfig = Array.from({ length: allyTeamCount }, (_, allyTeamIndex) => {
            const existing = draft.value?.allyTeamConfig[allyTeamIndex];
            const teams = Array.from({ length: playersPerAllyTeam }, (_, teamIndex) => ({
                maxPlayers: existing?.teams[teamIndex]?.maxPlayers ?? 1,
            }));
            return {
                maxTeams: playersPerAllyTeam,
                startBox: clone(nextBoxes[allyTeamIndex]),
                teams,
            };
        });
        if (draft.value.mapOptions.startBoxesIndex === undefined || boxes.length !== allyTeamCount) {
            draft.value.mapOptions.startBoxesIndex = undefined;
            draft.value.mapOptions.customStartBoxes = nextBoxes;
        }
    }

    function removeAllyTeam(index: number) {
        if (!draft.value || draft.value.allyTeamConfig.length <= 1) return;
        const allyTeamConfig = draft.value.allyTeamConfig.filter((_, allyTeamIndex) => allyTeamIndex !== index);
        draft.value.allyTeamConfig = allyTeamConfig;
        draft.value.mapOptions = {
            ...draft.value.mapOptions,
            startPosType: StartPosType.Boxes,
            startBoxesIndex: undefined,
            customStartBoxes: boxesFromConfig(allyTeamConfig),
        };
    }

    function createPayload(): LobbyCreateRequestData {
        if (!draft.value || !draft.value.mapName) throw new Error("Cannot create a lobby without a map");
        return {
            name: draft.value.name,
            mapName: draft.value.mapName,
            allyTeamConfig: clone(draft.value.allyTeamConfig),
            areBossesEnabled: draft.value.areBossesEnabled,
        };
    }

    function updatePayload(): LobbyUpdateRequestData {
        if (!draft.value) throw new Error("Cannot update a lobby without an open draft");
        const payload: LobbyUpdateRequestData = {};
        const dirty = dirtyFields.value;
        if (dirty.has("name")) payload.name = draft.value.name;
        if (dirty.has("mapName")) payload.mapName = draft.value.mapName;
        if (dirty.has("allyTeamConfig")) payload.allyTeamConfig = arrayToConfigRecord(draft.value.allyTeamConfig);
        return payload;
    }

    function syncFromServer(server: LobbySettingsDraft) {
        if (!base.value || !draft.value) return;
        const fields: LobbyDraftField[] = ["name", "mapName", "allyTeamConfig"];
        let acceptedServerBoxes = false;
        for (const field of fields) {
            const localChanged = JSON.stringify(base.value[field]) !== JSON.stringify(draft.value[field]);
            const serverChanged = JSON.stringify(base.value[field]) !== JSON.stringify(server[field]);
            const same = JSON.stringify(draft.value[field]) === JSON.stringify(server[field]);
            if (!localChanged || same) {
                copyField(draft.value, field, server);
                if (field === "allyTeamConfig" && serverChanged) acceptedServerBoxes = true;
            } else if (serverChanged) {
                const conflict = makeConflict(field, base.value, draft.value, server);
                const conflictIndex = conflicts.findIndex((existing) => existing.field === field);
                if (conflictIndex === -1) conflicts.push(conflict);
                else conflicts[conflictIndex] = conflict;
            }
            copyField(base.value, field, server);
        }
        if (acceptedServerBoxes) syncPreviewFromConfig();
    }

    function syncFromLobby(lobby: Lobby, map: MapData | undefined) {
        const server = createDraftFromLobby(lobby, map);
        syncFromServer(server);
        if (draft.value && !conflicts.some((conflict) => conflict.field === "mapName")) {
            draft.value.map = map;
        }
    }

    function useServer(field: LobbyDraftField) {
        const conflictIndex = conflicts.findIndex((conflict) => conflict.field === field);
        if (conflictIndex === -1) return;
        const conflict = conflicts[conflictIndex];
        if (!draft.value) return;
        switch (conflict.field) {
            case "name":
                draft.value.name = conflict.server;
                break;
            case "mapName":
                draft.value.mapName = conflict.server;
                draft.value.map = conflict.serverMap;
                if (draft.value.mapOptions.startPosType === StartPosType.Boxes) syncPreviewFromConfig();
                break;
            case "allyTeamConfig":
                draft.value.allyTeamConfig = clone(conflict.server);
                syncPreviewFromConfig();
                break;
        }
        conflicts.splice(conflictIndex, 1);
    }

    function keepMine(field: LobbyDraftField) {
        const conflictIndex = conflicts.findIndex((conflict) => conflict.field === field);
        if (conflictIndex !== -1) conflicts.splice(conflictIndex, 1);
    }

    return {
        mode,
        base,
        draft,
        dirtyFields,
        conflicts,
        openCreate,
        openUpdate,
        purge,
        updateDraft,
        setMapOptions,
        setCustomStartBoxes,
        setMap,
        setTeamCounts,
        removeAllyTeam,
        createPayload,
        updatePayload,
        syncFromServer,
        syncFromLobby,
        useServer,
        keepMine,
    };
}
