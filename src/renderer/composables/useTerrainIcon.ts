// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { type Terrain } from "@main/content/maps/map-metadata";
import { t, type TranslationKey } from "@renderer/i18n";
import { computed } from "vue";

export function useTerrain(terrain: Terrain) {
    return computed<TerrainData>(() => ({ tooltip: t(terrains[terrain].tooltipKey), icon: terrains[terrain].icon }));
}

export type TerrainData = {
    tooltip: string;
    icon: string;
};

const terrains: Record<Terrain, { tooltipKey: TranslationKey; icon: string }> = {
    acidic: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipAcidic",
        icon: "map_acidic.png",
    },
    alien: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipAlien",
        icon: "map_alien.png",
    },
    asteroid: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipAsteroid",
        icon: "map_asteroid.png",
    },
    asymmetrical: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipAsymmetrical",
        icon: "map_asymmetrical.png",
    },
    chokepoints: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipChokepoints",
        icon: "map_chokepoints.png",
    },
    desert: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipDesert",
        icon: "map_desert.png",
    },
    flat: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipFlat",
        icon: "map_flat.png",
    },
    forests: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipForests",
        icon: "map_forests.png",
    },
    grassy: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipGrassy",
        icon: "map_grassy.png",
    },
    hills: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipHills",
        icon: "map_hills.png",
    },
    ice: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipIce",
        icon: "map_ice.png",
    },
    industrial: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipIndustrial",
        icon: "map_industrial.png",
    },
    island: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipIsland",
        icon: "map_island.png",
    },
    jungle: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipJungle",
        icon: "map_jungle.png",
    },
    lava: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipLava",
        icon: "map_lava.png",
    },
    metal: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipMetal",
        icon: "map_metal.png",
    },
    ruins: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipRuins",
        icon: "map_ruins.png",
    },
    sea: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipSea",
        icon: "map_sea.png",
    },
    shallows: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipShallows",
        icon: "map_shallows.png",
    },
    space: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipSpace",
        icon: "map_space.png",
    },
    swamp: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipSwamp",
        icon: "map_swamp.png",
    },
    tropical: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipTropical",
        icon: "map_tropical.png",
    },
    wasteland: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipWasteland",
        icon: "map_wasteland.png",
    },
    water: {
        tooltipKey: "lobby.composables.useTerrainIcon.tooltipWater",
        icon: "map_water.png",
    },
};
