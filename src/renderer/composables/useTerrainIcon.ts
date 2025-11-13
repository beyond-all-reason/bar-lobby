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
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipAcidic"),
        icon: "map_acidic.png",
    },
    alien: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipAlien"),
        icon: "map_alien.png",
    },
    asteroid: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipAsteroid"),
        icon: "map_asteroid.png",
    },
    asymmetrical: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipAsymmetrical"),
        icon: "map_asymmetrical.png",
    },
    chokepoints: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipChokepoints"),
        icon: "map_chokepoints.png",
    },
    desert: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipDesert"),
        icon: "map_desert.png",
    },
    flat: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipFlat"),
        icon: "map_flat.png",
    },
    forests: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipForests"),
        icon: "map_forests.png",
    },
    grassy: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipGrassy"),
        icon: "map_grassy.png",
    },
    hills: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipHills"),
        icon: "map_hills.png",
    },
    ice: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipIce"),
        icon: "map_ice.png",
    },
    industrial: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipIndustrial"),
        icon: "map_industrial.png",
    },
    island: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipIsland"),
        icon: "map_island.png",
    },
    jungle: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipJungle"),
        icon: "map_jungle.png",
    },
    lava: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipLava"),
        icon: "map_lava.png",
    },
    metal: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipMetal"),
        icon: "map_metal.png",
    },
    ruins: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipRuins"),
        icon: "map_ruins.png",
    },
    sea: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipSea"),
        icon: "map_sea.png",
    },
    shallows: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipShallows"),
        icon: "map_shallows.png",
    },
    space: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipSpace"),
        icon: "map_space.png",
    },
    swamp: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipSwamp"),
        icon: "map_swamp.png",
    },
    tropical: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipTropical"),
        icon: "map_tropical.png",
    },
    wasteland: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipWasteland"),
        icon: "map_wasteland.png",
    },
    water: {
        tooltip: i18n.global.t("lobby.composables.useTerrainIcon.tooltipWater"),
        icon: "map_water.png",
    },
};
