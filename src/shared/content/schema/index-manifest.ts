// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type, Static } from "@sinclair/typebox";
import { SchemaReference } from "./common";

// campaigns/manifest.json, scenarios/manifest.json and tutorials/manifest.json.
export const IndexManifest = Type.Object(
    {
        $schema: Type.Optional(SchemaReference),
        order: Type.Array(Type.String({ minLength: 1, title: "Folder", description: "Folder name of an item in this folder." }), {
            uniqueItems: true,
            title: "Display order",
            description: "Folder names in the order they are shown. Items left out come after these, sorted by id.",
        }),
    },
    {
        title: "Content index manifest",
        description: "Display order of the campaigns, scenarios or tutorials in the folder that holds this manifest.json.",
    }
);

export type IndexManifest = Static<typeof IndexManifest>;
