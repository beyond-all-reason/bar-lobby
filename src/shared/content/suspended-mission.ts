// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// A mission the player saved in game and left part way, to continue later. The engine's save (.ssf) holds the
// game itself; this file beside it holds what the client needs to launch it again. An item keeps at most one,
// under the same name as its progress save, and playing the item from the start, or recording a result for it,
// discards it. Like progress saves, the format belongs to the client.

import { Type, Static } from "@sinclair/typebox";
import { SingleplayerSave, type SaveChange } from "./save";

// The newest format this client reads. One with a higher version was written by a newer client and is left alone.
export const SUSPENDED_FORMAT_VERSION = 1;

// Extra properties are allowed and ignored, so a newer client's additions don't make the file unreadable.
export const SuspendedMissionFile = Type.Object({
    formatVersion: Type.Integer({ minimum: 1 }),
    item: SingleplayerSave.properties.item,
    missionId: Type.String({ minLength: 1 }),
    // The name the game was played under, which loading it needs: it is the player in the save's start script.
    playerName: Type.String({ minLength: 1 }),
    difficulty: Type.Optional(Type.String({ minLength: 1 })),
    // The engine checks only its own version on load. Nothing checks the game or the mission archive, so the
    // client does, by these.
    engineVersion: Type.String({ minLength: 1 }),
    gameVersion: Type.String({ minLength: 1 }),
    archiveName: Type.String({ minLength: 1 }),
    archiveSha256: Type.String({ pattern: "^[0-9a-f]{64}$" }),
    // The campaign's saveVersion when the game was launched. Left out for a scenario or tutorial.
    saveVersion: Type.Optional(Type.Integer({ minimum: 1 })),
    // When the engine wrote the save, as an ISO time.
    savedAt: Type.String({ minLength: 1 }),
});

export type SuspendedMissionFile = Static<typeof SuspendedMissionFile> & { item: SaveChange["item"] };

// Why a suspended mission can't be continued on this install as it is now.
export type SuspendedUnusable = "engine_unavailable" | "game_unavailable" | "archive_changed" | "save_version_changed" | "mission_unavailable";

// What the renderer is told about an item's suspended mission.
export type SuspendedMission = {
    item: SaveChange["item"];
    missionId: string;
    savedAt: string;
    unusable?: SuspendedUnusable;
};

// An item's suspended mission as it is now, or undefined once discarded.
export type SuspendedChange = { item: SaveChange["item"]; suspended: SuspendedMission | undefined };
