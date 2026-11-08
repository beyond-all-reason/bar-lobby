// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Pieces more than one content file shares. Everything in this folder imports only TypeBox and its
// siblings, so the folder can be lifted out as it is.

import { Type, Static, type StringOptions } from "@sinclair/typebox";

// The client writes these strings into a mission's start script, plain `key=value;` text that the engine reads
// with parse_tdf.lua: a value ends at the first `;` and can't cross a line break, leading spaces are dropped,
// and a value wrapped in double quotes loses them. A script the engine can't read is taken as empty, and the
// game just doesn't start, so these rules keep any content that validates safe to launch.
export const SCRIPT_VALUE_PATTERN = '^[^;"\\r\\n\\s](?:[^;"\\r\\n]*[^;"\\r\\n\\s])?$';
export const SCRIPT_VALUE_RULE = "No semicolons, double quotes or line breaks, and no spaces at either end.";

// The engine lowercases start script keys, so keys differing only in case would silently replace each other.
const SCRIPT_KEY_PATTERN = "^[a-z0-9_]+$";
const SCRIPT_KEY_RULE = "Lowercase letters, digits and underscores only.";

// The modoption the client passes the mission API's options in. Content can't set it.
export const MISSION_OPTIONS_KEY = "missionoptions";

export const scriptValue = (options: StringOptions & { description: string }) =>
    Type.String({ minLength: 1, ...options, pattern: SCRIPT_VALUE_PATTERN, description: `${options.description} ${SCRIPT_VALUE_RULE}` });

// A key the client writes into the start script, optionally with keys the client writes itself left out.
export const scriptKey = (reserved: readonly string[] = []) => Type.String({ pattern: reserved.length > 0 ? `^(?!(?:${reserved.join("|")})$)[a-z0-9_]+$` : SCRIPT_KEY_PATTERN });

export const scriptKeyRule = (reserved: readonly string[] = []) => `${SCRIPT_KEY_RULE}${reserved.length > 0 ? ` ${reserved.map((key) => `\`${key}\``).join(", ")} is set by the client.` : ""}`;

/**
 * The newest content format this client reads. Content that declares a higher `formatVersion` was written
 * for a newer client and is reported as such rather than read under rules it was not written for.
 */
export const SUPPORTED_FORMAT_VERSION = 1;

export const FormatVersion = Type.Integer({
    minimum: 1,
    title: "Format version",
    description: `Version of the content format this file follows. Leave it out for version 1. A client that supports an older version reports the content as needing a newer client. This client supports version ${SUPPORTED_FORMAT_VERSION}.`,
});

// Editors read `$schema` to find the schema for a file. It is listed so the hover docs explain it, and the
// loader ignores it.
export const SchemaReference = Type.String({
    title: "Schema",
    description: "Path or URL of the JSON Schema for this file, for editor autocomplete and errors. The client ignores it.",
});

// A rapid tag such as `byar:test` names whatever version the tag points at today, so it is refused: the
// pair must name a version someone has played the content on.
const exactVersion = (title: string, description: string) => Type.String({ minLength: 1, pattern: "^[^:]+$", title, description });

export const CompatibilityEntry = Type.Object(
    {
        engineVersion: exactVersion("Engine version", "Exact engine version, as the client names installed engines. Rapid tags and wildcards are not accepted."),
        gameVersions: Type.Array(exactVersion("Game version", "Exact game version, the full version string of the game archive. Rapid tags such as `byar:test` are not accepted."), {
            minItems: 1,
            uniqueItems: true,
            title: "Game versions",
            description: "Every game version that works with this engine version. A game listed here pairs with this engine only.",
        }),
    },
    {
        title: "Compatible engine and games",
        description: "One engine version and the game versions that work with it.",
    }
);

export const Compatibility = Type.Array(CompatibilityEntry, {
    minItems: 1,
    title: "Compatibility",
    description: "Engine and game pairs this content has been tested with. Each entry pairs one engine with its games, and only those pairs count. List each engine once.",
});

// Content made in the mission editor runs on its overlay of unreleased game code, so there is no released
// pair to name yet. The client loads it only in dev mode, and validate-content refuses it unless told
// otherwise, so it cannot ship as official content by accident.
export const DEV_COMPATIBILITY = "dev";

export const ItemCompatibility = Type.Union(
    [
        Compatibility,
        Type.Literal(DEV_COMPATIBILITY, {
            title: "In development",
            description: "Not yet tested on a released engine and game, such as content still being made in the mission editor. Loads only in dev mode.",
        }),
    ],
    {
        title: "Compatibility",
        description: `${Compatibility.description} Content still in development, with no released pair to name, gives "${DEV_COMPATIBILITY}" instead and loads only in dev mode.`,
    }
);

export type CompatibilityEntry = Static<typeof CompatibilityEntry>;
export type Compatibility = Static<typeof Compatibility>;
export type ItemCompatibility = Static<typeof ItemCompatibility>;

// The difficulties the mission API defines, in its luarules/mission_api/difficulties.json, easiest first.
// The client passes the chosen one to the mission by id, and the mission decides what it means.
export const DIFFICULTIES = ["story", "easy", "medium", "hard"] as const;

export const Difficulty = Type.Union(
    DIFFICULTIES.map((id) => Type.Literal(id)),
    { title: "Difficulty", description: `One of the mission API's difficulties: ${DIFFICULTIES.join(", ")}.` }
);

export const Difficulties = Type.Array(Difficulty, {
    minItems: 1,
    uniqueItems: true,
    title: "Difficulties",
    description: "The difficulties this content can be played at. The player chooses from these.",
});

export const DefaultDifficulty = Type.Union(Difficulty.anyOf, {
    title: "Default difficulty",
    description: "The difficulty chosen until the player picks another. Must be one of `difficulties`.",
});

export type Difficulty = Static<typeof Difficulty>;

export const ContentFileName = Type.String({
    minLength: 1,
    title: "File",
    description: "Path of a file, relative to the folder this file is in. It must stay inside that folder.",
});
