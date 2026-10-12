// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type, type Static } from "@sinclair/typebox";

// Kept plain and serializable so it can be sent to the server once filtering moves there.
// An absent field means "no filter".

const rangeSchema = Type.Object({
    min: Type.Optional(Type.Number()),
    max: Type.Optional(Type.Number()),
});

// No null: coerceTypes converts between null and false in unions. Name is for usage clarity
const triStateSchema = Type.Boolean();

export const lobbyFiltersSchema = Type.Object({
    title: Type.Optional(Type.String()),
    tags: Type.Optional(Type.Array(Type.String())),
    maps: Type.Optional(Type.Array(Type.String())),
    players: Type.Optional(rangeSchema),
    openSpots: Type.Optional(rangeSchema),
    fitsParty: Type.Optional(Type.Boolean()),
    allyTeams: Type.Optional(rangeSchema),
    inProgress: Type.Optional(triStateSchema),
    passworded: Type.Optional(triStateSchema),
    bossMode: Type.Optional(triStateSchema),
    hasFriend: Type.Optional(Type.Boolean()),
    hasPartyMember: Type.Optional(Type.Boolean()),
    engineVersion: Type.Optional(Type.String()),
    gameVersion: Type.Optional(Type.String()),
});

export const lobbySortKeySchema = Type.Union([
    Type.Literal("playerCount"),
    Type.Literal("openSpots"),
    Type.Literal("maxPlayerCount"),
    Type.Literal("name"),
    Type.Literal("mapName"),
    Type.Literal("battleDuration"),
]);

export const lobbySortSchema = Type.Object({
    key: lobbySortKeySchema,
    order: Type.Union([Type.Literal(1), Type.Literal(-1)]),
});

export const lobbyListQuerySchema = Type.Object({
    filters: lobbyFiltersSchema,
    sort: lobbySortSchema,
});

export type LobbyRange = Static<typeof rangeSchema>;
export type LobbyTriState = Static<typeof triStateSchema>;
export type LobbyFilters = Static<typeof lobbyFiltersSchema>;
export type LobbySortKey = Static<typeof lobbySortKeySchema>;
export type LobbySort = Static<typeof lobbySortSchema>;
export type LobbyListQuery = Static<typeof lobbyListQuerySchema>;

export const DEFAULT_LOBBY_LIST_QUERY: LobbyListQuery = {
    filters: { players: { min: 1 } },
    sort: { key: "playerCount", order: -1 },
};

// structuredClone rejects reactive proxies. JSON also drops undefined fields from the saved file.
export function cloneLobbyListQuery(query: LobbyListQuery): LobbyListQuery {
    return JSON.parse(JSON.stringify(query));
}
