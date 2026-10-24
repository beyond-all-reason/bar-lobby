// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Saved singleplayer progress: one file per campaign, scenario or tutorial played. The format belongs to the
// client, not to content authors, so it lives outside schema/ and is not exported with the content schemas.
//
// A save holds where the player stands: each result is applied once, when it arrives, and only its effect is
// kept. A content update that changes the unlock rules applies from the player's next result on and never
// rewrites what they already have. Each save is self-contained, so it can be synced between machines, or sent
// by a co-op host to the other players, as it is, and it stays the same size however often the item is played.

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
    // Results kept for support, newest last. Nothing is worked out from them.
    recentResults: 20,
};

export const SaveVariableValue = Type.Union([Type.String({ maxLength: SAVE_LIMITS.variableStringLength }), Type.Number(), Type.Boolean()]);

// What one result reports. Each key replaces the saved value of that key, and null deletes it.
export const SaveVariables = Type.Record(Type.String(), Type.Union([SaveVariableValue, Type.Null()]), {
    propertyNames: { type: "string", minLength: 1, maxLength: SAVE_LIMITS.variableKeyLength },
});

const MissionId = Type.String({ minLength: 1 });

// What a finished game reports for one mission.
export const ReportedResult = Type.Object({
    missionId: MissionId,
    outcome: Type.Union([Type.Literal("victory"), Type.Literal("failure")]),
    variables: Type.Optional(SaveVariables),
});

// A reported result as kept in a save's recent results, with when it was recorded as an ISO time.
const RecentResult = Type.Intersect([ReportedResult, Type.Object({ at: Type.String() })]);

const MissionIds = Type.Array(MissionId);

export const MissionPlays = Type.Object({
    victories: Type.Integer({ minimum: 0 }),
    failures: Type.Integer({ minimum: 0 }),
});

// Where the player stands in a campaign. Completed missions are the ones with a victory in the save's plays,
// and what can be played now and whether the campaign is finished are worked out from the current config.
export const CampaignProgress = Type.Object({
    // Unlocked now, including won missions that are not replayable and so not offered.
    unlocked: MissionIds,
    // Unlocked once, then taken away by a result.
    removed: MissionIds,
    // Missions whose prerequisites have unlocked them. They unlock a mission once, so a later removal sticks.
    prerequisitesMet: MissionIds,
    variables: Type.Record(Type.String(), SaveVariableValue),
});

// Extra properties are allowed everywhere and kept on rewrite, so fields a newer client adds survive a save
// passing through an older one.
export const SingleplayerSave = Type.Object({
    formatVersion: Type.Integer({ minimum: 1 }),
    // The content's saveVersion when the save was started. Left out means 1.
    saveVersion: Type.Optional(Type.Integer({ minimum: 1 })),
    item: Type.Object({
        kind: Type.Union([Type.Literal("campaign"), Type.Literal("scenario"), Type.Literal("tutorial")]),
        source: Type.String({ minLength: 1 }),
        rootId: Type.String({ minLength: 1 }),
        id: Type.String({ minLength: 1 }),
    }),
    // Victories and failures per mission. A scenario or tutorial has one entry, under its own id.
    plays: Type.Record(Type.String(), MissionPlays),
    campaign: Type.Optional(CampaignProgress),
    recent: Type.Array(RecentResult),
});

export type SaveVariableValue = Static<typeof SaveVariableValue>;
export type SaveVariables = Static<typeof SaveVariables>;
export type ReportedResult = Static<typeof ReportedResult>;
export type MissionPlays = Static<typeof MissionPlays>;
export type CampaignProgress = Static<typeof CampaignProgress>;
export type SingleplayerSave = Static<typeof SingleplayerSave> & { item: { kind: SingleplayerKind } & SingleplayerItemRef };

/**
 * Whether a save can be used with the content as it is now. A campaign raises its saveVersion for a change that
 * breaks progress, so a save started under an older version has to be started over. One started under a newer
 * version is waiting for that content to arrive, and is left alone.
 */
export type SaveCompatibility = "compatible" | "older" | "newer";

export function saveCompatibility(save: Pick<SingleplayerSave, "saveVersion">, contentSaveVersion = 1): SaveCompatibility {
    const saveVersion = save.saveVersion ?? 1;
    if (saveVersion === contentSaveVersion) {
        return "compatible";
    }

    return saveVersion < contentSaveVersion ? "older" : "newer";
}

// A save as written, or undefined once deleted, for the item it belongs to.
export type SaveChange = { item: SingleplayerItemRef & { kind: SingleplayerKind }; save: SingleplayerSave | undefined };

/**
 * What a save is kept under. Ids are unique within one root and one kind only, so all four parts are needed:
 * a campaign and a tutorial may share an id, as may official, custom and Workshop items.
 */
export function saveKey(kind: SingleplayerKind, { source, rootId, id }: SingleplayerItemRef) {
    return JSON.stringify([kind, source, rootId, id]);
}
