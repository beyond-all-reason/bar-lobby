// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type, type Static } from "@sinclair/typebox";

// The query is kept plain and serializable so it can be sent to the server as-is once
// filtering moves there. Every field is optional because an absent field means "no filter".
// It is also persisted in settings, and an invalid settings file is thrown away whole, so
// nothing in here is stricter than it has to be.

const rangeSchema = Type.Object({
    min: Type.Optional(Type.Number()),
    max: Type.Optional(Type.Number()),
});

// null means "don't care", the same as an absent field.
const triStateSchema = Type.Union([Type.Boolean(), Type.Null()]);

export const lobbyFiltersSchema = Type.Object({
    title: Type.Optional(Type.String()),
    tags: Type.Optional(Type.Array(Type.String())),
    maps: Type.Optional(Type.Array(Type.String())),
    players: Type.Optional(rangeSchema),
    openSpots: Type.Optional(rangeSchema),
    // Room for the user's whole party, sized when the list is filtered rather than when this is set.
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

// Hiding empty lobbies was the old default, so a minimum of one player carries it over.
export const DEFAULT_LOBBY_LIST_QUERY: LobbyListQuery = {
    filters: { players: { min: 1 } },
    sort: { key: "playerCount", order: -1 },
};

// A JSON round trip rather than structuredClone, because the query usually comes out of a
// reactive store and structuredClone refuses proxies. It also drops undefined fields, which
// keeps the settings file free of keys that mean nothing.
export function cloneLobbyListQuery(query: LobbyListQuery): LobbyListQuery {
    return JSON.parse(JSON.stringify(query));
}
