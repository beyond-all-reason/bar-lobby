// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { setupI18n } from "@renderer/i18n";
import { computed } from "vue";

const i18n = setupI18n();

export function useTerrain(terrain: string) {
    return computed(() => terrains[terrain]);
}

export type TerrainData = {
    tooltip: string;
    icon: string;
};

const terrains: Record<string, TerrainData> = {
    acidic: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-acidic'),
        icon: "map_acidic.png",
    },
    alien: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-alien'),
        icon: "map_alien.png",
    },
    asteroid: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-asteroid'),
        icon: "map_asteroid.png",
    },
    asymmetrical: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-asymmetrical'),
        icon: "map_asymmetrical.png",
    },
    chokepoints: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-chokepoints'),
        icon: "map_chokepoints.png",
    },
    desert: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-desert'),
        icon: "map_desert.png",
    },
    flat: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-flat'),
        icon: "map_flat.png",
    },
    forests: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-forests'),
        icon: "map_forests.png",
    },
    grassy: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-grassy'),
        icon: "map_grassy.png",
    },
    hills: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-hills'),
        icon: "map_hills.png",
    },
    ice: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-ice'),
        icon: "map_ice.png",
    },
    industrial: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-industrial'),
        icon: "map_industrial.png",
    },
    island: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-island'),
        icon: "map_island.png",
    },
    jungle: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-jungle'),
        icon: "map_jungle.png",
    },
    lava: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-lava'),
        icon: "map_lava.png",
    },
    metal: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-metal'),
        icon: "map_metal.png",
    },
    ruins: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-ruins'),
        icon: "map_ruins.png",
    },
    sea: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-sea'),
        icon: "map_sea.png",
    },
    shallows: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-shallows'),
        icon: "map_shallows.png",
    },
    space: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-space'),
        icon: "map_space.png",
    },
    swamp: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-swamp'),
        icon: "map_swamp.png",
    },
    tropical: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-tropical'),
        icon: "map_tropical.png",
    },
    wasteland: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-wasteland'),
        icon: "map_wasteland.png",
    },
    water: {
        tooltip: i18n.global.t('lobby.composables.use-terrain-icon.tooltip-water'),
        icon: "map_water.png",
    },
};
