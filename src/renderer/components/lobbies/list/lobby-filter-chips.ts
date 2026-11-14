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
import type { LobbyFilters, LobbyRange } from "@shared/lobby-list-query";
import type { TranslationKey, TypedTranslate } from "@renderer/i18n";
import { activeFilters, type LobbyFilterKey } from "@renderer/logic/lobby-list/filters";

export type LobbyFilterChipContext = {
    t: TypedTranslate;
    mapDisplayName(springName: string): string;
    availableTags: ReadonlySet<string>;
};

export type LobbyFilterChip = {
    id: string;
    icon: IconifyIcon;
    label: string;
    tooltip: string;
    warning?: boolean;
    remove(filters: LobbyFilters): void;
};

type ChipContent = Omit<LobbyFilterChip, "icon">;

type LobbyFilterChipDef<K extends LobbyFilterKey> = {
    icon: IconifyIcon;
    chips(value: NonNullable<LobbyFilters[K]>, ctx: LobbyFilterChipContext): ChipContent[];
};

function clearKey(key: LobbyFilterKey) {
    return (filters: LobbyFilters) => {
        delete filters[key];
    };
}

export function formatRange(range: LobbyRange, t: TypedTranslate): string {
    if (range.min !== undefined && range.max !== undefined) {
        return range.min === range.max ? String(range.min) : t("lobby.multiplayer.custom.filters.range.between", range);
    }
    if (range.min !== undefined) return t("lobby.multiplayer.custom.filters.range.atLeast", range);
    return t("lobby.multiplayer.custom.filters.range.atMost", range);
}

function singleChip(key: LobbyFilterKey, labelKey: TranslationKey, tooltipKey: TranslationKey, params?: Record<string, unknown>) {
    return (t: TypedTranslate): ChipContent[] => [{ id: key, label: t(labelKey, params ?? {}), tooltip: t(tooltipKey, params ?? {}), remove: clearKey(key) }];
}

function rangeChip(key: "players" | "openSpots" | "allyTeams"): LobbyFilterChipDef<typeof key>["chips"] {
    return (value, { t }) =>
        singleChip(key, `lobby.multiplayer.custom.filters.${key}.chip`, `lobby.multiplayer.custom.filters.${key}.tooltip`, {
            value: formatRange(value, t),
        })(t);
}

function triStateChip(key: "inProgress" | "passworded" | "bossMode"): LobbyFilterChipDef<typeof key>["chips"] {
    return (value, { t }) =>
        value
            ? singleChip(key, `lobby.multiplayer.custom.filters.${key}.chipYes`, `lobby.multiplayer.custom.filters.${key}.tooltipYes`)(t)
            : singleChip(key, `lobby.multiplayer.custom.filters.${key}.chipNo`, `lobby.multiplayer.custom.filters.${key}.tooltipNo`)(t);
}

function flagChip(key: "fitsParty" | "hasFriend" | "hasPartyMember"): LobbyFilterChipDef<typeof key>["chips"] {
    return (_value, { t }) => singleChip(key, `lobby.multiplayer.custom.filters.${key}.chip`, `lobby.multiplayer.custom.filters.${key}.tooltip`)(t);
}

function versionChip(key: "engineVersion" | "gameVersion"): LobbyFilterChipDef<typeof key>["chips"] {
    return (value, { t }) => singleChip(key, `lobby.multiplayer.custom.filters.${key}.chip`, `lobby.multiplayer.custom.filters.${key}.tooltip`, { value })(t);
}

export const lobbyFilterChipDefs: { [K in LobbyFilterKey]: LobbyFilterChipDef<K> } = {
    title: {
        icon: magnifyIcon,
        chips: (value, { t }) => singleChip("title", "lobby.multiplayer.custom.filters.title.chip", "lobby.multiplayer.custom.filters.title.tooltip", { value })(t),
    },
    tags: {
        icon: tagOutlineIcon,
        // Per tag, so ones the server no longer uses can be removed individually.
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
    },
    maps: {
        icon: mapOutlineIcon,
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
    },
    players: { icon: accountIcon, chips: rangeChip("players") },
    openSpots: { icon: locationEnterIcon, chips: rangeChip("openSpots") },
    fitsParty: { icon: accountMultipleCheckIcon, chips: flagChip("fitsParty") },
    allyTeams: { icon: accountMultipleIcon, chips: rangeChip("allyTeams") },
    inProgress: { icon: swordCrossIcon, chips: triStateChip("inProgress") },
    passworded: { icon: lockOutlineIcon, chips: triStateChip("passworded") },
    bossMode: { icon: hammerIcon, chips: triStateChip("bossMode") },
    hasFriend: { icon: accountFavoriteIcon, chips: flagChip("hasFriend") },
    hasPartyMember: { icon: accountGroupIcon, chips: flagChip("hasPartyMember") },
    engineVersion: { icon: engineOutlineIcon, chips: versionChip("engineVersion") },
    gameVersion: { icon: engineOutlineIcon, chips: versionChip("gameVersion") },
};

export function lobbyFilterChips(filters: LobbyFilters, devMode: boolean, ctx: LobbyFilterChipContext): LobbyFilterChip[] {
    return activeFilters(filters, devMode).flatMap((def) => {
        const chipDef = lobbyFilterChipDefs[def.key] as LobbyFilterChipDef<LobbyFilterKey>;
        return chipDef.chips(filters[def.key] as never, ctx).map((chip) => ({ ...chip, icon: chipDef.icon }));
    });
}
