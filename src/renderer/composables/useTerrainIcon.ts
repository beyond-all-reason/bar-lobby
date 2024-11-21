import { computed } from "vue";

export function useTerrain(terrain: string) {
    return computed(() => terrains[terrain]);
}

export type TerrainData = {
    tooltip: string;
    icon: string;
};

const terrains: Record<string, TerrainData> = {
    acidic: {
        tooltip: "Acidic and dangerous waters",
        icon: "map_acidic.png",
    },
    alien: {
        tooltip: "Exotic alient biomes",
        icon: "map_alien.png",
    },
    asteroid: {
        tooltip: "Lunar landscape, with low gravity and (no) wind",
        icon: "map_asteroid.png",
    },
    asymmetrical: {
        tooltip: "Asymmetrical map",
        icon: "map_asymmetrical.png",
    },
    chokepoints: {
        tooltip: "Narrow passages",
        icon: "map_chokepoints.png",
    },
    desert: {
        tooltip: "Rocky or sandy, barren desert",
        icon: "map_desert.png",
    },
    flat: {
        tooltip: "Contains large flat areas",
        icon: "map_flat.png",
    },
    forests: {
        tooltip: "Lots of trees",
        icon: "map_forests.png",
    },
    grassy: {
        tooltip: "Lots of crispy green grass",
        icon: "map_grassy.png",
    },
    hills: {
        tooltip: "Hilly or mountainous terrain",
        icon: "map_hills.png",
    },
    ice: {
        tooltip: "A cold place",
        icon: "map_ice.png",
    },
    industrial: {
        tooltip: "Industrial map with ancient constructions",
        icon: "map_industrial.png",
    },
    island: {
        tooltip: "Island map, land fully surrounded by water",
        icon: "map_island.png",
    },
    jungle: {
        tooltip: "Dense foliage and forests",
        icon: "map_jungle.png",
    },
    lava: {
        tooltip: "Dangerous lava pools",
        icon: "map_lava.png",
    },
    metal: {
        tooltip: "Metal map, where (most of) the surface is made of extractable metal",
        icon: "map_metal.png",
    },
    ruins: {
        tooltip: "Structures or ruins",
        icon: "map_ruins.png",
    },
    sea: {
        tooltip: "Large bodies of water or Sea",
        icon: "map_sea.png",
    },
    shallows: {
        tooltip: "Passable shallow water like creeks, rivers and beaches",
        icon: "map_shallows.png",
    },
    space: {
        tooltip: "In outerspace, usually without wind",
        icon: "map_space.png",
    },
    swamp: {
        tooltip: "Swampy, wet terrain with lots of ponds and foliage",
        icon: "map_swamp.png",
    },
    tropical: {
        tooltip: "Tropical biome with beaches, palms and tropical fish",
        icon: "map_tropical.png",
    },
    wasteland: {
        tooltip: "Forgotten wasteland that hasn't seen life in a long time",
        icon: "map_wasteland.png",
    },
    water: {
        tooltip: "Smaller bodies of water like lakes, ponds or rivers",
        icon: "map_water.png",
    },
};
