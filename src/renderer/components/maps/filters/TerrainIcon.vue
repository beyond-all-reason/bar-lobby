<template>
    <div class="image-wrapper" v-tooltip.right="{ value: terrainInfo.tooltip }">
        <img :src="imageUrl" :alt="terrain" class="icon" />
    </div>
</template>

<script setup lang="ts">
import { type Terrain } from "@main/content/maps/map-metadata";
import { useTerrain } from "@renderer/composables/useTerrainIcon";

const { terrain } = defineProps<{ terrain: Terrain }>();
const terrainInfo = useTerrain(terrain);
const imageUrl = new URL(`/src/renderer/assets/images/icons/terrains/${terrainInfo.value.icon}`, import.meta.url).href;
</script>

<style lang="scss" scoped>
.image-wrapper {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    img.icon {
        display: block;
        width: 24px;
        height: 24px;
    }

    &.lg {
        height: 44px;
        width: 44px;
        img.icon {
            width: 32px;
            height: 32px;
        }
    }
}
</style>
