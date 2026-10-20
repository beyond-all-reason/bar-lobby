// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Pieces more than one content file shares. Everything in this folder imports only TypeBox and its
// siblings, so the folder can be lifted out as it is.

import { Type, Static } from "@sinclair/typebox";

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

export type CompatibilityEntry = Static<typeof CompatibilityEntry>;
export type Compatibility = Static<typeof Compatibility>;

export const ContentFileName = Type.String({
    minLength: 1,
    title: "File",
    description: "Path of a file, relative to the folder this file is in. It must stay inside that folder.",
});
