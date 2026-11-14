// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { Component } from "vue";
import type { TranslationKey, TypedTranslate } from "@renderer/i18n";
import type { LobbyFilterKey } from "@renderer/logic/lobby-list/filters";
import BooleanFilter from "@renderer/components/lobbies/list/filters/BooleanFilter.vue";
import MapsFilter from "@renderer/components/lobbies/list/filters/MapsFilter.vue";
import RangeFilter from "@renderer/components/lobbies/list/filters/RangeFilter.vue";
import TagsFilter from "@renderer/components/lobbies/list/filters/TagsFilter.vue";
import TitleFilter from "@renderer/components/lobbies/list/filters/TitleFilter.vue";
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
    inlineLabel?: boolean;
    props?(ctx: LobbyFilterEditorContext): Record<string, unknown>;
};

export const lobbyFilterEditors: Record<LobbyFilterKey, LobbyFilterEditor> = {
    title: { component: TitleFilter, labelKey: "lobby.multiplayer.custom.filters.title.label" },
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
    openSpots: {
        component: RangeFilter,
        labelKey: "lobby.multiplayer.custom.filters.openSpots.label",
        props: () => ({ min: 0, max: 16 }),
    },
    fitsParty: {
        component: BooleanFilter,
        labelKey: "lobby.multiplayer.custom.filters.fitsParty.label",
        inlineLabel: true,
        props: ({ t }) => ({ label: t("lobby.multiplayer.custom.filters.fitsParty.label") }),
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
        props: ({ t }) => ({
            label: t("lobby.multiplayer.custom.filters.inProgress.label"),
            hideTooltip: t("lobby.multiplayer.custom.filters.inProgress.tooltipNo"),
            onlyTooltip: t("lobby.multiplayer.custom.filters.inProgress.tooltipYes"),
        }),
    },
    passworded: {
        component: TriStateFilter,
        labelKey: "lobby.multiplayer.custom.filters.passworded.label",
        inlineLabel: true,
        props: ({ t }) => ({
            label: t("lobby.multiplayer.custom.filters.passworded.label"),
            hideTooltip: t("lobby.multiplayer.custom.filters.passworded.tooltipNo"),
            onlyTooltip: t("lobby.multiplayer.custom.filters.passworded.tooltipYes"),
        }),
    },
    bossMode: {
        component: TriStateFilter,
        labelKey: "lobby.multiplayer.custom.filters.bossMode.label",
        inlineLabel: true,
        props: ({ t }) => ({
            label: t("lobby.multiplayer.custom.filters.bossMode.label"),
            hideTooltip: t("lobby.multiplayer.custom.filters.bossMode.tooltipNo"),
            onlyTooltip: t("lobby.multiplayer.custom.filters.bossMode.tooltipYes"),
        }),
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
