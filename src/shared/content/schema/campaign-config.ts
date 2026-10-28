// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type, Static } from "@sinclair/typebox";
import { FormatVersion, ItemCompatibility, SchemaReference } from "./common";

const missionIds = (title: string, description: string) =>
    Type.Array(Type.String({ minLength: 1, title: "Mission id", description: "A key of `missions`." }), {
        uniqueItems: true,
        title,
        description,
    });

export const CampaignMission = Type.Object(
    {
        settings: Type.Optional(
            Type.Object(
                {
                    replayable: Type.Optional(
                        Type.Boolean({
                            title: "Replayable",
                            description: "Whether the mission stays available after it is won. Overrides the campaign's `settings.replayableMissions`.",
                        })
                    ),
                },
                { title: "Mission settings", description: "Settings for this mission that override the campaign's." }
            )
        ),
        victoryUnlocks: Type.Optional(missionIds("Unlocked on victory", "Missions that become available when this mission is won.")),
        victoryRemoves: Type.Optional(missionIds("Removed on victory", "Missions that stop being available when this mission is won, including ones not unlocked yet.")),
        failureUnlocks: Type.Optional(missionIds("Unlocked on failure", "Missions that become available when this mission is lost.")),
        failureRemoves: Type.Optional(missionIds("Removed on failure", "Missions that stop being available when this mission is lost, including ones not unlocked yet.")),
        prerequisites: Type.Optional(missionIds("Prerequisites", "Missions that must all be won before this mission becomes available.")),
    },
    {
        title: "Campaign mission",
        description:
            "How a mission unlocks and is unlocked. A mission becomes available when any mission that unlocks it is played, or when all its prerequisites are won. Once a result removes a mission, only another result's unlock brings it back: its prerequisites don't.",
    }
);

export const CampaignConfig = Type.Object(
    {
        $schema: Type.Optional(SchemaReference),
        formatVersion: Type.Optional(FormatVersion),
        saveVersion: Type.Optional(
            Type.Integer({
                minimum: 1,
                title: "Save version",
                description:
                    "Version of the campaign's progress rules. Leave it out for version 1. Raise it only for a change that breaks players' saved progress: every player of an earlier version then has to start the campaign over. See the content schema README for which changes need it.",
            })
        ),
        campaignId: Type.String({ minLength: 1, title: "Campaign id", description: "Id of the campaign. Must equal the campaign's folder name, and stays the same once released." }),
        titleKey: Type.String({ minLength: 1, title: "Title key", description: "Language key of the campaign's title, looked up in shared/language/." }),
        descriptionKey: Type.String({ minLength: 1, title: "Description key", description: "Language key of the campaign's description, looked up in shared/language/." }),
        backgroundImage: Type.Optional(Type.String({ minLength: 1, title: "Background image", description: "Image file in the campaign's shared/media/ folder." })),
        logo: Type.Optional(Type.String({ minLength: 1, title: "Logo", description: "Image file in the campaign's shared/media/ folder." })),
        players: Type.Array(Type.Integer({ minimum: 1, title: "Player count", description: "A number of human players the campaign can be played with." }), {
            minItems: 1,
            uniqueItems: true,
            title: "Player counts",
            description: "Every number of human players the campaign supports. Each mission needs a config for each count, or a default config.",
        }),
        settings: Type.Optional(
            Type.Object(
                {
                    replayableMissions: Type.Optional(Type.Boolean({ title: "Replayable missions", description: "Whether missions stay available after they are won. Defaults to false." })),
                },
                { title: "Campaign settings", description: "Settings that apply to every mission unless the mission overrides them." }
            )
        ),
        missions: Type.Record(Type.String({ minLength: 1 }), CampaignMission, {
            minProperties: 1,
            title: "Missions",
            description: "Every mission in the campaign, keyed by mission id. Each id must equal a mission folder name and that mission's `missionId`, and stays the same once released.",
        }),
        startMission: Type.Array(Type.String({ minLength: 1, title: "Mission id", description: "A key of `missions`." }), {
            minItems: 1,
            uniqueItems: true,
            title: "Start missions",
            description: "Missions available when the campaign starts.",
        }),
        finalMission: missionIds("Final missions", "Missions that finish the campaign when won."),
        compatibility: ItemCompatibility,
    },
    {
        title: "Campaign config",
        description: "campaignConfig.json in a campaign folder: the campaign's details and how its missions unlock.",
    }
);

export type CampaignMission = Static<typeof CampaignMission>;
export type CampaignConfig = Static<typeof CampaignConfig>;
