// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type, Static } from "@sinclair/typebox";
import { Compatibility, CompatibilityEntry, ContentFileName, FormatVersion, SchemaReference } from "./common";

// manifest.json in a campaign mission, scenario or tutorial folder.
export const MissionManifest = Type.Object(
    {
        $schema: Type.Optional(SchemaReference),
        formatVersion: Type.Optional(FormatVersion),
        missionId: Type.String({
            minLength: 1,
            title: "Mission id",
            description: "Id of the mission, scenario or tutorial. Must equal its folder name, and for a campaign mission its key in `missions`. Stays the same once released.",
        }),
        titleKey: Type.String({ minLength: 1, title: "Title key", description: "Language key of the title." }),
        descriptionKey: Type.String({ minLength: 1, title: "Description key", description: "Language key of the description." }),
        entryPoint: Type.String({ minLength: 1, title: "Entry point", description: "Lua file the mission starts from, relative to this folder." }),
        mapName: Type.String({ minLength: 1, title: "Map", description: "Name of the map the mission is played on, as the engine names it." }),
        image: Type.Optional(
            Type.String({
                minLength: 1,
                title: "Image",
                description: "Image file shown for the mission. A campaign mission's is in the campaign's shared/media/ folder, a scenario's or tutorial's in its own media/ folder.",
            })
        ),
        backgroundImage: Type.Optional(
            Type.String({
                minLength: 1,
                title: "Background image",
                description: "Image file shown behind the mission. A campaign mission's is in the campaign's shared/media/ folder, a scenario's or tutorial's in its own media/ folder.",
            })
        ),
        config: Type.Object(
            {
                default: Type.String({ minLength: 1, title: "Default config", description: "Mission config used for any player count without its own, relative to this folder." }),
                numPlayers: Type.Optional(
                    Type.Record(Type.String({ pattern: "^[1-9][0-9]*$" }), ContentFileName, {
                        // Keyed by player count, so any other key is a mistake rather than a newer field.
                        additionalProperties: false,
                        title: "Configs by player count",
                        description: 'Mission config for a number of human players, keyed by that number, such as "2".',
                    })
                ),
            },
            {
                title: "Mission configs",
                description: "The mission config files, relative to this folder: a default, and optionally a config per player count.",
            }
        ),
        compatibility: Type.Optional(
            Type.Array(CompatibilityEntry, {
                minItems: 1,
                title: "Compatibility",
                description: `${Compatibility.description} Required for a scenario or tutorial. A campaign mission leaves it out and uses the campaign's.`,
            })
        ),
    },
    {
        title: "Mission manifest",
        description: "manifest.json in a campaign mission, scenario or tutorial folder.",
    }
);

export type MissionManifest = Static<typeof MissionManifest>;
