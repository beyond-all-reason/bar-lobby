// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { LobbyFilters, LobbyRange, LobbyTriState } from "@shared/lobby-list-query";
import type { LobbyListEntry, LobbyMatchContext } from "@renderer/model/lobby-list";

// Each of these filters needs a field Tachyon doesn't send yet. Turn one on once the server does;
// none of them depend on each other.
const TACHYON_TAGS = false;
const TACHYON_ALLY_TEAMS = false;
const TACHYON_PASSWORDED = false;
const TACHYON_BOSS_MODE = false;
const TACHYON_HAS_FRIEND = false;
const TACHYON_HAS_PARTY_MEMBER = false;

export type LobbyFilterKey = keyof LobbyFilters;

// How each filter narrows the list. How it looks (icon, chips, editor) lives with the components.
export type LobbyFilterDef<K extends LobbyFilterKey = LobbyFilterKey> = {
    key: K;
    // Off means the filter is hidden from the menu, shows no chip and matches everything.
    available: boolean;
    devOnly?: boolean;
    isActive(value: LobbyFilters[K]): boolean;
    match(lobby: LobbyListEntry, value: NonNullable<LobbyFilters[K]>, ctx: LobbyMatchContext): boolean;
};

function defineFilter<K extends LobbyFilterKey>(def: LobbyFilterDef<K>): LobbyFilterDef<K> {
    return def;
}

export function isRangeActive(range: LobbyRange | undefined): boolean {
    return range?.min !== undefined || range?.max !== undefined;
}

export function inRange(value: number, range: LobbyRange): boolean {
    return (range.min === undefined || value >= range.min) && (range.max === undefined || value <= range.max);
}

const isTriStateActive = (value: LobbyTriState | undefined) => value === true || value === false;

// Matching against a field the server doesn't send yet lets every lobby through, so turning a
// filter on before Tachyon supports it narrows nothing rather than hiding the whole list.
function matchOptional<T>(field: T | undefined, test: (field: T) => boolean): boolean {
    return field === undefined || test(field);
}

/** Player slots still free. Never negative, even if the server briefly reports more players than slots. */
export function openSpots(lobby: LobbyListEntry): number {
    return Math.max(0, lobby.maxPlayerCount - lobby.playerCount);
}

const containsAny = (memberIds: readonly string[], ids: ReadonlySet<string>) => memberIds.some((id) => ids.has(id));

export const lobbyFilters = [
    defineFilter({
        key: "title",
        available: true,
        isActive: (value) => !!value?.trim(),
        match: (lobby, value) => lobby.name.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()),
    }),
    defineFilter({
        key: "tags",
        available: TACHYON_TAGS,
        isActive: (value) => !!value?.length,
        match: (lobby, value) => matchOptional(lobby.tags, (tags) => value.some((tag) => tags.includes(tag))),
    }),
    defineFilter({
        key: "maps",
        available: true,
        isActive: (value) => !!value?.length,
        match: (lobby, value) => value.includes(lobby.mapName),
    }),
    defineFilter({
        key: "players",
        available: true,
        isActive: isRangeActive,
        match: (lobby, value) => inRange(lobby.playerCount, value),
    }),
    // Nearly full lobbies start sooner, while roomier ones can take a whole party.
    defineFilter({
        key: "openSpots",
        available: true,
        isActive: isRangeActive,
        match: (lobby, value) => inRange(openSpots(lobby), value),
    }),
    defineFilter({
        key: "fitsParty",
        available: true,
        isActive: (value) => value === true,
        match: (lobby, _value, { partySize }) => openSpots(lobby) >= partySize,
    }),
    defineFilter({
        key: "allyTeams",
        available: TACHYON_ALLY_TEAMS,
        isActive: isRangeActive,
        match: (lobby, value) => matchOptional(lobby.allyTeamCount, (count) => inRange(count, value)),
    }),
    defineFilter({
        key: "inProgress",
        available: true,
        isActive: isTriStateActive,
        match: (lobby, value) => !!lobby.currentBattle === value,
    }),
    defineFilter({
        key: "passworded",
        available: TACHYON_PASSWORDED,
        isActive: isTriStateActive,
        match: (lobby, value) => matchOptional(lobby.passworded, (passworded) => passworded === value),
    }),
    defineFilter({
        key: "bossMode",
        available: TACHYON_BOSS_MODE,
        isActive: isTriStateActive,
        match: (lobby, value) => matchOptional(lobby.bossMode, (bossMode) => bossMode === value),
    }),
    defineFilter({
        key: "hasFriend",
        available: TACHYON_HAS_FRIEND,
        isActive: (value) => value === true,
        match: (lobby, _value, { friendIds }) => matchOptional(lobby.memberIds, (memberIds) => containsAny(memberIds, friendIds)),
    }),
    defineFilter({
        key: "hasPartyMember",
        available: TACHYON_HAS_PARTY_MEMBER,
        isActive: (value) => value === true,
        match: (lobby, _value, { partyMemberIds }) => matchOptional(lobby.memberIds, (memberIds) => containsAny(memberIds, partyMemberIds)),
    }),
    defineFilter({
        key: "engineVersion",
        available: true,
        devOnly: true,
        isActive: (value) => !!value,
        match: (lobby, value) => lobby.engineVersion === value,
    }),
    defineFilter({
        key: "gameVersion",
        available: true,
        devOnly: true,
        isActive: (value) => !!value,
        match: (lobby, value) => lobby.gameVersion === value,
    }),
] as LobbyFilterDef[];

/** Whether a filter can be used at all right now, regardless of its value. */
export function isFilterEnabled(def: LobbyFilterDef, devMode: boolean): boolean {
    return def.available && (!def.devOnly || devMode);
}

/** The filters that are enabled and set to something that narrows the list. */
export function activeFilters(filters: LobbyFilters, devMode: boolean): LobbyFilterDef[] {
    return lobbyFilters.filter((def) => isFilterEnabled(def, devMode) && def.isActive(filters[def.key] as never));
}

export function matchesFilters(lobby: LobbyListEntry, filters: LobbyFilters, ctx: LobbyMatchContext): boolean {
    return activeFilters(filters, ctx.devMode).every((def) => def.match(lobby, filters[def.key] as never, ctx));
}

/**
 * Deletes the values of filters that can't be used right now (dev-only ones outside dev mode, and
 * ones still waiting on Tachyon), so they don't come back unseen when the filter does. Returns
 * whether anything was deleted.
 */
export function removeDisabledFilters(filters: LobbyFilters, devMode: boolean): boolean {
    let removed = false;
    for (const def of lobbyFilters) {
        if (!isFilterEnabled(def, devMode) && def.key in filters) {
            delete filters[def.key];
            removed = true;
        }
    }
    return removed;
}
