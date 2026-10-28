// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type, Static, type TSchema } from "@sinclair/typebox";
import { SchemaReference } from "./common";

// Team and alliance names become the startscript team and allyteam `name`, which is how the mission API finds them.
const NAME_PATTERN = "^[A-Za-z0-9_]+$";
const NAME_RULE = "Names use letters, digits and underscores only.";

const name = (title: string, description: string) => Type.String({ pattern: NAME_PATTERN, title, description: `${description} ${NAME_RULE}` });

const teamName = name("Team", "A team named in `alliances`.");

// Keyed by name, so any other key is a mistake rather than a newer field.
const byName = <T extends TSchema>(value: T, options: { title: string; description: string; minProperties?: number }) =>
    Type.Record(Type.String({ pattern: NAME_PATTERN }), value, { ...options, additionalProperties: false, description: `${options.description} ${NAME_RULE}` });

// An enum rather than a union of literals, so a wrong value is one error naming them all instead of one per value.
const START_POS_TYPES = ["fixed", "random", "in-game", "in-client"] as const;
type StartPosType = (typeof START_POS_TYPES)[number];

const startRectEdge = (title: string) => Type.Number({ minimum: 0, maximum: 1, title, description: "Edge of the start box, as a fraction of the map size from 0 to 1." });

const optionValue = Type.Union([Type.String(), Type.Number(), Type.Boolean()], { title: "Value", description: "Value of the option." });

export const AllianceSettings = Type.Object(
    {
        alliedWith: Type.Optional(name("Allied with", "An alliance named in `alliances` that this alliance is allied with.")),
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
        alliances: byName(Type.Array(teamName, { minItems: 1, uniqueItems: true, title: "Teams", description: "The teams in this alliance. Each team belongs to one alliance." }), {
            minProperties: 1,
            title: "Alliances",
            description: "Every alliance in the mission, keyed by name, with the teams in it.",
        }),
        playerTeam: Type.Array(teamName, {
            minItems: 1,
            title: "Player teams",
            description: "Teams for the human players, assigned in the order players are in the lobby.",
        }),
        startPosType: Type.Optional(
            Type.Unsafe<StartPosType>({
                type: "string",
                enum: START_POS_TYPES,
                title: "Start position type",
                description: "How start positions are picked: fixed, random, in-game or in-client.",
            })
        ),
        allianceSettings: Type.Optional(byName(AllianceSettings, { title: "Alliance settings", description: "Settings per alliance, keyed by a name in `alliances`." })),
        teamSettings: Type.Optional(byName(TeamSettings, { title: "Team settings", description: "Settings per team, keyed by a team in `alliances`." })),
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
