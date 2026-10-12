// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { LobbySort, LobbySortKey } from "@shared/lobby-list-query";
import type { LobbyListEntry } from "@renderer/model/lobby-list";
import type { TranslationKey } from "@renderer/i18n";
import { openSpots } from "@renderer/logic/lobby-list/filters";

export type LobbySortDef = {
    key: LobbySortKey;
    labelKey: TranslationKey;
    // Ascending order. A lobby with nothing to compare can return undefined from value(), and
    // always sorts after the rest, whichever way the list is ordered.
    value(lobby: LobbyListEntry, now: number): number | string | undefined;
};

export const lobbySorts: LobbySortDef[] = [
    { key: "playerCount", labelKey: "lobby.multiplayer.custom.sort.playerCount", value: (lobby) => lobby.playerCount },
    { key: "openSpots", labelKey: "lobby.multiplayer.custom.sort.openSpots", value: openSpots },
    { key: "maxPlayerCount", labelKey: "lobby.multiplayer.custom.sort.maxPlayerCount", value: (lobby) => lobby.maxPlayerCount },
    { key: "name", labelKey: "lobby.multiplayer.custom.sort.name", value: (lobby) => lobby.name },
    { key: "mapName", labelKey: "lobby.multiplayer.custom.sort.mapName", value: (lobby) => lobby.mapName },
    {
        key: "battleDuration",
        labelKey: "lobby.multiplayer.custom.sort.battleDuration",
        // Waiting lobbies count as below any running battle, so ascending puts them first and
        // descending puts them last. Running battles never go below zero, which keeps one that a
        // skewed clock says hasn't started yet out among the waiting ones. UnixTime is in microseconds.
        value: (lobby, now) => (lobby.currentBattle ? Math.max(0, now - lobby.currentBattle.startedAt / 1000) : -1),
    },
];

const sortsByKey = new Map(lobbySorts.map((sort) => [sort.key, sort]));

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function compareValues(a: number | string, b: number | string): number {
    if (typeof a === "string" && typeof b === "string") return collator.compare(a, b);
    return (a as number) - (b as number);
}

/**
 * Orders lobbies by the given sort. Ties fall back to the title and then the id, so the same
 * lobbies always come out in the same order.
 */
export function compareLobbies(a: LobbyListEntry, b: LobbyListEntry, sort: LobbySort, now: number): number {
    const def = sortsByKey.get(sort.key);
    if (def) {
        const valueA = def.value(a, now);
        const valueB = def.value(b, now);
        if (valueA === undefined || valueB === undefined) {
            if (valueA !== valueB) return valueA === undefined ? 1 : -1;
        } else {
            const result = compareValues(valueA, valueB) * sort.order;
            if (result !== 0) return result;
        }
    }
    return collator.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
