// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { IconifyIcon } from "@iconify/vue";
import accountIcon from "@iconify-icons/mdi/account";
import accountFavoriteIcon from "@iconify-icons/mdi/account-favorite";
import accountGroupIcon from "@iconify-icons/mdi/account-group";
import accountMultipleCheckIcon from "@iconify-icons/mdi/account-multiple-check";
import accountMultipleIcon from "@iconify-icons/mdi/account-multiple";
import engineOutlineIcon from "@iconify-icons/mdi/engine-outline";
import hammerIcon from "@iconify-icons/mdi/hammer";
import lockOutlineIcon from "@iconify-icons/mdi/lock-outline";
import magnifyIcon from "@iconify-icons/mdi/magnify";
import mapOutlineIcon from "@iconify-icons/mdi/map-outline";
import locationEnterIcon from "@iconify-icons/mdi/location-enter";
import swordCrossIcon from "@iconify-icons/mdi/sword-cross";
import tagOutlineIcon from "@iconify-icons/mdi/tag-outline";
import type { LobbyFilters, LobbyRange, LobbyTriState } from "@shared/lobby-list-query";
import type { LobbyListEntry, LobbyMatchContext } from "@renderer/model/lobby-list";
import type { TypedTranslate } from "@renderer/i18n";

// Each of these filters needs a field Tachyon doesn't send yet. Turn one on once the server does;
// none of them depend on each other.
const TACHYON_TAGS = false;
const TACHYON_ALLY_TEAMS = false;
const TACHYON_PASSWORDED = false;
const TACHYON_BOSS_MODE = false;
const TACHYON_HAS_FRIEND = false;
const TACHYON_HAS_PARTY_MEMBER = false;

export type LobbyFilterKey = keyof LobbyFilters;

export type LobbyFilterChipContext = {
    t: TypedTranslate;
    mapDisplayName(springName: string): string;
    availableTags: ReadonlySet<string>;
};

export type LobbyFilterChip = {
    // Unique among all chips, for v-for.
    id: string;
    label: string;
    tooltip: string;
    warning?: boolean;
    // Takes this chip's part out of the filters, leaving the rest alone.
    remove(filters: LobbyFilters): void;
};

export type LobbyFilterDef<K extends LobbyFilterKey = LobbyFilterKey> = {
    key: K;
    icon: IconifyIcon;
    // Off means the filter is hidden from the menu, shows no chip and matches everything.
    available: boolean;
    devOnly?: boolean;
    isActive(value: LobbyFilters[K]): boolean;
    chips(value: NonNullable<LobbyFilters[K]>, ctx: LobbyFilterChipContext): LobbyFilterChip[];
    match(lobby: LobbyListEntry, value: NonNullable<LobbyFilters[K]>, ctx: LobbyMatchContext): boolean;
};

function defineFilter<K extends LobbyFilterKey>(def: LobbyFilterDef<K>): LobbyFilterDef<K> {
    return def;
}

function clearKey(key: LobbyFilterKey) {
    return (filters: LobbyFilters) => {
        delete filters[key];
    };
}

export function isRangeActive(range: LobbyRange | undefined): boolean {
    return range?.min !== undefined || range?.max !== undefined;
}

export function inRange(value: number, range: LobbyRange): boolean {
    return (range.min === undefined || value >= range.min) && (range.max === undefined || value <= range.max);
}

export function formatRange(range: LobbyRange, t: TypedTranslate): string {
    if (range.min !== undefined && range.max !== undefined) {
        return range.min === range.max ? String(range.min) : t("lobby.multiplayer.custom.filters.range.between", range);
    }
    if (range.min !== undefined) return t("lobby.multiplayer.custom.filters.range.atLeast", range);
    return t("lobby.multiplayer.custom.filters.range.atMost", range);
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
        icon: magnifyIcon,
        available: true,
        isActive: (value) => !!value?.trim(),
        chips: (value, { t }) => [
            {
                id: "title",
                label: t("lobby.multiplayer.custom.filters.title.chip", { value }),
                tooltip: t("lobby.multiplayer.custom.filters.title.tooltip", { value }),
                remove: clearKey("title"),
            },
        ],
        match: (lobby, value) => lobby.name.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()),
    }),
    defineFilter({
        key: "tags",
        icon: tagOutlineIcon,
        available: TACHYON_TAGS,
        isActive: (value) => !!value?.length,
        // One chip per tag, so a tag the server has stopped using can be picked out and removed.
        chips: (value, { t, availableTags }) =>
            value.map((tag) => {
                const unknown = !availableTags.has(tag);
                return {
                    id: `tags:${tag}`,
                    label: t("lobby.multiplayer.custom.filters.tags.chip", { value: tag }),
                    tooltip: unknown ? t("lobby.multiplayer.custom.filters.tags.unknown") : t("lobby.multiplayer.custom.filters.tags.tooltip", { value: tag }),
                    warning: unknown,
                    remove: (filters) => {
                        filters.tags = filters.tags?.filter((other) => other !== tag);
                        if (!filters.tags?.length) delete filters.tags;
                    },
                };
            }),
        match: (lobby, value) => matchOptional(lobby.tags, (tags) => value.some((tag) => tags.includes(tag))),
    }),
    defineFilter({
        key: "maps",
        icon: mapOutlineIcon,
        available: true,
        isActive: (value) => !!value?.length,
        chips: (value, { t, mapDisplayName }) => {
            const names = value.map(mapDisplayName);
            return [
                {
                    id: "maps",
                    label: names.length === 1 ? t("lobby.multiplayer.custom.filters.maps.chipOne", { value: names[0] }) : t("lobby.multiplayer.custom.filters.maps.chipMany", { count: names.length }),
                    tooltip: t("lobby.multiplayer.custom.filters.maps.tooltip", { value: names.join(", ") }),
                    remove: clearKey("maps"),
                },
            ];
        },
        match: (lobby, value) => value.includes(lobby.mapName),
    }),
    defineFilter({
        key: "players",
        icon: accountIcon,
        available: true,
        isActive: isRangeActive,
        chips: (value, { t }) => [
            {
                id: "players",
                label: t("lobby.multiplayer.custom.filters.players.chip", { value: formatRange(value, t) }),
                tooltip: t("lobby.multiplayer.custom.filters.players.tooltip", { value: formatRange(value, t) }),
                remove: clearKey("players"),
            },
        ],
        match: (lobby, value) => inRange(lobby.playerCount, value),
    }),
    // Nearly full lobbies start sooner, while roomier ones can take a whole party.
    defineFilter({
        key: "openSpots",
        icon: locationEnterIcon,
        available: true,
        isActive: isRangeActive,
        chips: (value, { t }) => [
            {
                id: "openSpots",
                label: t("lobby.multiplayer.custom.filters.openSpots.chip", { value: formatRange(value, t) }),
                tooltip: t("lobby.multiplayer.custom.filters.openSpots.tooltip", { value: formatRange(value, t) }),
                remove: clearKey("openSpots"),
            },
        ],
        match: (lobby, value) => inRange(openSpots(lobby), value),
    }),
    defineFilter({
        key: "fitsParty",
        icon: accountMultipleCheckIcon,
        available: true,
        isActive: (value) => value === true,
        chips: (_value, { t }) => [
            {
                id: "fitsParty",
                label: t("lobby.multiplayer.custom.filters.fitsParty.chip"),
                tooltip: t("lobby.multiplayer.custom.filters.fitsParty.tooltip"),
                remove: clearKey("fitsParty"),
            },
        ],
        match: (lobby, _value, { partySize }) => openSpots(lobby) >= partySize,
    }),
    defineFilter({
        key: "allyTeams",
        icon: accountMultipleIcon,
        available: TACHYON_ALLY_TEAMS,
        isActive: isRangeActive,
        chips: (value, { t }) => [
            {
                id: "allyTeams",
                label: t("lobby.multiplayer.custom.filters.allyTeams.chip", { value: formatRange(value, t) }),
                tooltip: t("lobby.multiplayer.custom.filters.allyTeams.tooltip", { value: formatRange(value, t) }),
                remove: clearKey("allyTeams"),
            },
        ],
        match: (lobby, value) => matchOptional(lobby.allyTeamCount, (count) => inRange(count, value)),
    }),
    defineFilter({
        key: "inProgress",
        icon: swordCrossIcon,
        available: true,
        isActive: isTriStateActive,
        chips: (value, { t }) => [
            {
                id: "inProgress",
                label: t(value ? "lobby.multiplayer.custom.filters.inProgress.chipYes" : "lobby.multiplayer.custom.filters.inProgress.chipNo"),
                tooltip: t(value ? "lobby.multiplayer.custom.filters.inProgress.tooltipYes" : "lobby.multiplayer.custom.filters.inProgress.tooltipNo"),
                remove: clearKey("inProgress"),
            },
        ],
        match: (lobby, value) => !!lobby.currentBattle === value,
    }),
    defineFilter({
        key: "passworded",
        icon: lockOutlineIcon,
        available: TACHYON_PASSWORDED,
        isActive: isTriStateActive,
        chips: (value, { t }) => [
            {
                id: "passworded",
                label: t(value ? "lobby.multiplayer.custom.filters.passworded.chipYes" : "lobby.multiplayer.custom.filters.passworded.chipNo"),
                tooltip: t(value ? "lobby.multiplayer.custom.filters.passworded.tooltipYes" : "lobby.multiplayer.custom.filters.passworded.tooltipNo"),
                remove: clearKey("passworded"),
            },
        ],
        match: (lobby, value) => matchOptional(lobby.passworded, (passworded) => passworded === value),
    }),
    defineFilter({
        key: "bossMode",
        icon: hammerIcon,
        available: TACHYON_BOSS_MODE,
        isActive: isTriStateActive,
        chips: (value, { t }) => [
            {
                id: "bossMode",
                label: t(value ? "lobby.multiplayer.custom.filters.bossMode.chipYes" : "lobby.multiplayer.custom.filters.bossMode.chipNo"),
                tooltip: t(value ? "lobby.multiplayer.custom.filters.bossMode.tooltipYes" : "lobby.multiplayer.custom.filters.bossMode.tooltipNo"),
                remove: clearKey("bossMode"),
            },
        ],
        match: (lobby, value) => matchOptional(lobby.bossMode, (bossMode) => bossMode === value),
    }),
    defineFilter({
        key: "hasFriend",
        icon: accountFavoriteIcon,
        available: TACHYON_HAS_FRIEND,
        isActive: (value) => value === true,
        chips: (_value, { t }) => [
            {
                id: "hasFriend",
                label: t("lobby.multiplayer.custom.filters.hasFriend.chip"),
                tooltip: t("lobby.multiplayer.custom.filters.hasFriend.tooltip"),
                remove: clearKey("hasFriend"),
            },
        ],
        match: (lobby, _value, { friendIds }) => matchOptional(lobby.memberIds, (memberIds) => containsAny(memberIds, friendIds)),
    }),
    defineFilter({
        key: "hasPartyMember",
        icon: accountGroupIcon,
        available: TACHYON_HAS_PARTY_MEMBER,
        isActive: (value) => value === true,
        chips: (_value, { t }) => [
            {
                id: "hasPartyMember",
                label: t("lobby.multiplayer.custom.filters.hasPartyMember.chip"),
                tooltip: t("lobby.multiplayer.custom.filters.hasPartyMember.tooltip"),
                remove: clearKey("hasPartyMember"),
            },
        ],
        match: (lobby, _value, { partyMemberIds }) => matchOptional(lobby.memberIds, (memberIds) => containsAny(memberIds, partyMemberIds)),
    }),
    defineFilter({
        key: "engineVersion",
        icon: engineOutlineIcon,
        available: true,
        devOnly: true,
        isActive: (value) => !!value,
        chips: (value, { t }) => [
            {
                id: "engineVersion",
                label: t("lobby.multiplayer.custom.filters.engineVersion.chip", { value }),
                tooltip: t("lobby.multiplayer.custom.filters.engineVersion.tooltip", { value }),
                remove: clearKey("engineVersion"),
            },
        ],
        match: (lobby, value) => lobby.engineVersion === value,
    }),
    defineFilter({
        key: "gameVersion",
        icon: engineOutlineIcon,
        available: true,
        devOnly: true,
        isActive: (value) => !!value,
        chips: (value, { t }) => [
            {
                id: "gameVersion",
                label: t("lobby.multiplayer.custom.filters.gameVersion.chip", { value }),
                tooltip: t("lobby.multiplayer.custom.filters.gameVersion.tooltip", { value }),
                remove: clearKey("gameVersion"),
            },
        ],
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
