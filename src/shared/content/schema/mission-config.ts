// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type, Static } from "@sinclair/typebox";
import { SchemaReference } from "./common";

const teamName = Type.String({ minLength: 1, title: "Team", description: "A team named in `alliances`." });

const startRectEdge = (title: string) => Type.Number({ minimum: 0, maximum: 1, title, description: "Edge of the start box, as a fraction of the map size from 0 to 1." });

const optionValue = Type.Union([Type.String(), Type.Number(), Type.Boolean()], { title: "Value", description: "Value of the option." });

export const AllianceSettings = Type.Object(
    {
        alliedWith: Type.Optional(Type.String({ minLength: 1, title: "Allied with", description: "An alliance named in `alliances` that this alliance is allied with." })),
        startRectTop: Type.Optional(startRectEdge("Start box top")),
        startRectLeft: Type.Optional(startRectEdge("Start box left")),
        startRectBottom: Type.Optional(startRectEdge("Start box bottom")),
        startRectRight: Type.Optional(startRectEdge("Start box right")),
    },
    { title: "Alliance settings", description: "Settings for one alliance." }
);

export const TeamSettings = Type.Object(
    {
        side: Type.Optional(Type.String({ minLength: 1, title: "Side", description: "Faction the team plays, such as Armada." })),
        incomeMultiplier: Type.Optional(Type.Number({ exclusiveMinimum: 0, title: "Income multiplier", description: "Multiplier on the team's resource income." })),
        startPosX: Type.Optional(Type.Number({ minimum: 0, title: "Start X", description: "Start position on the map's X axis, in elmos." })),
        startPosZ: Type.Optional(Type.Number({ minimum: 0, title: "Start Z", description: "Start position on the map's Z axis, in elmos." })),
        luaAI: Type.Optional(Type.String({ minLength: 1, title: "Lua AI", description: "Lua AI that controls the team, such as BarbAI." })),
    },
    { title: "Team settings", description: "Settings for one team. Other startscript team settings may be added too." }
);

// {config}.json named by a mission manifest's `config`. It is the input to the startscript, so it is checked
// in full before anything tries to launch it.
export const MissionConfig = Type.Object(
    {
        $schema: Type.Optional(SchemaReference),
        alliances: Type.Record(
            Type.String({ minLength: 1 }),
            Type.Array(teamName, { minItems: 1, uniqueItems: true, title: "Teams", description: "The teams in this alliance. Each team belongs to one alliance." }),
            { minProperties: 1, title: "Alliances", description: "Every alliance in the mission, keyed by name, with the teams in it." }
        ),
        playerTeam: Type.Array(teamName, {
            minItems: 1,
            title: "Player teams",
            description: "Teams for the human players, assigned in the order players are in the lobby.",
        }),
        startPosType: Type.Optional(
            Type.Union([Type.Literal("fixed"), Type.Literal("random"), Type.Literal("in-game"), Type.Literal("in-client")], {
                title: "Start position type",
                description: "How start positions are picked: fixed, random, in-game or in-client.",
            })
        ),
        allianceSettings: Type.Optional(
            Type.Record(Type.String({ minLength: 1 }), AllianceSettings, { title: "Alliance settings", description: "Settings per alliance, keyed by a name in `alliances`." })
        ),
        teamSettings: Type.Optional(Type.Record(Type.String({ minLength: 1 }), TeamSettings, { title: "Team settings", description: "Settings per team, keyed by a team in `alliances`." })),
        restrictions: Type.Optional(
            Type.Record(Type.String({ minLength: 1 }), Type.Integer({ minimum: 0, title: "Limit", description: "The most of this unit a team may build. 0 disables it." }), {
                title: "Unit restrictions",
                description: "Build limits keyed by unit name.",
            })
        ),
        modOptions: Type.Optional(Type.Record(Type.String({ minLength: 1 }), optionValue, { title: "Game options", description: "Game mod options keyed by option key." })),
        mapOptions: Type.Optional(Type.Record(Type.String({ minLength: 1 }), optionValue, { title: "Map options", description: "Map options keyed by option key." })),
    },
    {
        title: "Mission config",
        description: "A mission config file named by a mission manifest's `config`: the teams, alliances and options the mission starts with.",
    }
);

export type MissionConfig = Static<typeof MissionConfig>;
