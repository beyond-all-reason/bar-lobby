<route lang="json5">
{ props: true, meta: { title: "Map Details", transition: { name: "slide-left" } } }
</route>

<template>
    <div v-if="map" class="flex-col fullheight gap-md">
        <h1>{{ map.friendlyName }}</h1>

        <div class="container">
            <MapPreview class="map-preview" :map="map.scriptName" />

            <div class="details">
                <div class="detail-text"><b>Description:</b> {{ map.description }}</div>
                <div v-if="map.mapInfo?.author" class="detail-text"><b>Author:</b> {{ map.mapInfo.author }}</div>
                <div class="detail-text"><b>Size:</b> {{ map.width }} x {{ map.height }}</div>
                <div class="detail-text"><b>Wind:</b> {{ map.minWind }} - {{ map.maxWind }}</div>
                <div class="detail-text"><b>Tidal:</b> {{ map.tidalStrength }}</div>
                <div class="detail-text"><b>Gravity:</b> {{ map.gravity }}</div>
                <div class="detail-text"><b>Depth:</b> {{ map.minDepth }} - {{ map.maxDepth }}</div>
                <div class="detail-text"><b>Hardness:</b> {{ map.mapHardness }}</div>
                <div v-if="map.startPositions" class="detail-text"><b>Start Positions:</b> {{ map.startPositions.length }}</div>

                <Button class="green inline" @click="play">Play</Button>
            </div>
        </div>
    </div>
    <div v-else class="flex-col gap-md">
        <div>
            Map <strong>{{ id }}</strong> is not installed.
        </div>
        <Button class="green" style="align-self: flex-start" @click="downloadMap">Download</Button>
    </div>
</template>

<script lang="ts" setup>
/*
 * TODO:
 * Switch map preview between types
 * - Metal
 * - Height
 * - Type?
 * - 3D model
 * Back button to return to map list
 */

import { computed } from "vue";

import Button from "@/components/controls/Button.vue";
import MapPreview from "@/components/maps/MapPreview.vue";
import { defaultBattle } from "@/config/default-battle";

const props = defineProps<{
    id: string;
}>();

const map = computed(() => api.content.maps.getMapByScriptName(props.id));

function downloadMap() {
    api.content.maps.downloadMaps(props.id);
}

function play() {
    const battle = defaultBattle(map.value?.scriptName);
    api.game.launch(battle);
}
</script>

<style lang="scss" scoped>
.container {
    display: flex;
    flex-direction: row;
    flex: 1 1 auto;
    gap: 15px;
}
:deep(canvas) {
    height: 100%;
    max-height: 100%;
    width: 100%;
    max-width: 100%;
}
.map-preview {
    aspect-ratio: 1;
}
.details {
    display: flex;
    flex-direction: column;
    gap: 5px;
}
</style>
