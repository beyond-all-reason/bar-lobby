// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { Component } from "vue";
import type { TranslationKey, TypedTranslate } from "@renderer/i18n";
import type { LobbyFilterKey } from "@renderer/components/lobbies/list/lobby-filters";
import BooleanFilter from "@renderer/components/lobbies/list/filters/BooleanFilter.vue";
import MapsFilter from "@renderer/components/lobbies/list/filters/MapsFilter.vue";
import RangeFilter from "@renderer/components/lobbies/list/filters/RangeFilter.vue";
import TagsFilter from "@renderer/components/lobbies/list/filters/TagsFilter.vue";
import TriStateFilter from "@renderer/components/lobbies/list/filters/TriStateFilter.vue";
import VersionFilter from "@renderer/components/lobbies/list/filters/VersionFilter.vue";

export type LobbyFilterEditorContext = {
    t: TypedTranslate;
    availableTags: string[];
    availableEngineVersions: string[];
    availableGameVersions: string[];
};

export type LobbyFilterEditor = {
    component: Component;
    labelKey: TranslationKey;
    // Checkboxes carry their label inline, so the menu doesn't put a heading over them.
    inlineLabel?: boolean;
    props?(ctx: LobbyFilterEditorContext): Record<string, unknown>;
};

// Kept apart from the filter definitions so those stay free of components and can be tested on
// their own. Title has no entry: it is edited from the search box above the list.
export const lobbyFilterEditors: Partial<Record<LobbyFilterKey, LobbyFilterEditor>> = {
    tags: {
        component: TagsFilter,
        labelKey: "lobby.multiplayer.custom.filters.tags.label",
        props: ({ availableTags }) => ({ availableTags }),
    },
    maps: { component: MapsFilter, labelKey: "lobby.multiplayer.custom.filters.maps.label" },
    players: {
        component: RangeFilter,
        labelKey: "lobby.multiplayer.custom.filters.players.label",
        props: () => ({ min: 0, max: 16 }),
    },
    allyTeams: {
        component: RangeFilter,
        labelKey: "lobby.multiplayer.custom.filters.allyTeams.label",
        props: () => ({ min: 1, max: 16 }),
    },
    inProgress: {
        component: TriStateFilter,
        labelKey: "lobby.multiplayer.custom.filters.inProgress.label",
        inlineLabel: true,
        props: ({ t }) => ({ label: t("lobby.multiplayer.custom.filters.inProgress.label") }),
    },
    passworded: {
        component: TriStateFilter,
        labelKey: "lobby.multiplayer.custom.filters.passworded.label",
        inlineLabel: true,
        props: ({ t }) => ({ label: t("lobby.multiplayer.custom.filters.passworded.label") }),
    },
    bossMode: {
        component: TriStateFilter,
        labelKey: "lobby.multiplayer.custom.filters.bossMode.label",
        inlineLabel: true,
        props: ({ t }) => ({ label: t("lobby.multiplayer.custom.filters.bossMode.label") }),
    },
    hasFriend: {
        component: BooleanFilter,
        labelKey: "lobby.multiplayer.custom.filters.hasFriend.label",
        inlineLabel: true,
        props: ({ t }) => ({ label: t("lobby.multiplayer.custom.filters.hasFriend.label") }),
    },
    hasPartyMember: {
        component: BooleanFilter,
        labelKey: "lobby.multiplayer.custom.filters.hasPartyMember.label",
        inlineLabel: true,
        props: ({ t }) => ({ label: t("lobby.multiplayer.custom.filters.hasPartyMember.label") }),
    },
    engineVersion: {
        component: VersionFilter,
        labelKey: "lobby.multiplayer.custom.filters.engineVersion.label",
        props: ({ t, availableEngineVersions }) => ({
            versions: availableEngineVersions,
            anyLabel: t("lobby.multiplayer.custom.filters.engineVersion.any"),
        }),
    },
    gameVersion: {
        component: VersionFilter,
        labelKey: "lobby.multiplayer.custom.filters.gameVersion.label",
        props: ({ t, availableGameVersions }) => ({
            versions: availableGameVersions,
            anyLabel: t("lobby.multiplayer.custom.filters.gameVersion.any"),
        }),
    },
};
