// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Saved singleplayer progress: one file per campaign, scenario or tutorial played. The format belongs to the
// client, not to content authors, so it lives outside schema/ and is not exported with the content schemas.
//
// A save holds the results in the order they were played, never the state worked out from them, so a
// content update that changes the unlock graph applies to saves already written. Each save is self-contained,
// so it can be synced between machines, or sent by a co-op host to the other players, as it is.

import { Type, Static } from "@sinclair/typebox";
import type { SingleplayerItemRef, SingleplayerKind } from "./singleplayer";

// The newest save format this client reads. A save with a higher version was written by a newer client, maybe
// on another machine, and is left alone rather than overwritten.
export const SAVE_FORMAT_VERSION = 1;

// Kept small: saves count against cloud storage quotas, and variables are passed to every mission on launch.
export const SAVE_LIMITS = {
    variableKeyLength: 128,
    variableStringLength: 4096,
    variableCount: 256,
};

export const SaveVariableValue = Type.Union([Type.String({ maxLength: SAVE_LIMITS.variableStringLength }), Type.Number(), Type.Boolean()]);

// What one result reports. Each key replaces the saved value of that key, and null deletes it.
export const SaveVariables = Type.Record(Type.String(), Type.Union([SaveVariableValue, Type.Null()]), {
    propertyNames: { type: "string", minLength: 1, maxLength: SAVE_LIMITS.variableKeyLength },
});

export const SavedResult = Type.Object({
    missionId: Type.String({ minLength: 1 }),
    outcome: Type.Union([Type.Literal("victory"), Type.Literal("failure")]),
    variables: Type.Optional(SaveVariables),
    // When the result was recorded, as an ISO time. Set by the client, not by the mission.
    at: Type.Optional(Type.String()),
});

// Extra properties are allowed everywhere and kept on rewrite, so fields a newer client adds survive a save
// passing through an older one.
export const SingleplayerSave = Type.Object({
    formatVersion: Type.Integer({ minimum: 1 }),
    item: Type.Object({
        kind: Type.Union([Type.Literal("campaign"), Type.Literal("scenario"), Type.Literal("tutorial")]),
        source: Type.String({ minLength: 1 }),
        rootId: Type.String({ minLength: 1 }),
        id: Type.String({ minLength: 1 }),
    }),
    history: Type.Array(SavedResult),
});

export type SaveVariableValue = Static<typeof SaveVariableValue>;
export type SaveVariables = Static<typeof SaveVariables>;
export type SavedResult = Static<typeof SavedResult>;
export type SingleplayerSave = Static<typeof SingleplayerSave> & { item: { kind: SingleplayerKind } & SingleplayerItemRef };

// A save as written, or undefined once deleted, for the item it belongs to.
export type SaveChange = { item: SingleplayerItemRef & { kind: SingleplayerKind }; save: SingleplayerSave | undefined };

/**
 * What a save is kept under. Ids are unique within one root and one kind only, so all four parts are needed:
 * a campaign and a tutorial may share an id, as may official, custom and Workshop items.
 */
export function saveKey(kind: SingleplayerKind, { source, rootId, id }: SingleplayerItemRef) {
    return JSON.stringify([kind, source, rootId, id]);
}
