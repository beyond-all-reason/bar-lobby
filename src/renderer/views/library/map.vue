<route lang="json">
{ "meta": { "title": "Map Details", "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1 class="title">{{ map.friendlyName }}</h1>
        <div class="map-container">
            <div class="preview-container">
                <MapPreview class="preview" :map="map.scriptName" :static="true" />
            </div>
            <div class="detail-container">
                <div class="details">
                    <div class="detail-text"><b>Description:</b> {{ map.description }}</div>
                    <div v-if="map.mapInfo" class="detail-text"><b>Author:</b> {{ map.mapInfo.author }}</div>
                    <div class="detail-text"><b>Size:</b> {{ map.width }} x {{ map.height }}</div>
                    <div class="detail-text"><b>Wind:</b> {{ map.minWind }} - {{ map.maxWind }}</div>
                    <div class="detail-text"><b>Tidal:</b> {{ map.tidalStrength }}</div>
                    <div class="detail-text"><b>Gravity:</b> {{ map.gravity }}</div>
                    <div class="detail-text"><b>Depth:</b> {{ map.minDepth }} - {{ map.maxDepth }}</div>
                    <div class="detail-text"><b>Hardness:</b> {{ map.mapHardness }}</div>
                    <div v-if="map.startPositions" class="detail-text"><b>Start Positions:</b> {{ map.startPositions.length }}</div>
                </div>
            </div>
        </div>
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

import MapPreview from "@/components/maps/MapPreview.vue";
import { MapData } from "$/model/map-data";

const map = api.session.libraryPage.value as MapData;
</script>

<style lang="scss" scoped>
.title {
    font-size: 28px;
    font-weight: 600;
    margin-bottom: 15px;
}
.map-container {
    display: flex;
    flex-direction: row;
    gap: 15px;
}
.preview-container {
    width: 60%;
}
.preview {
}
.details {
    display: flex;
    flex-direction: column;
    margin: 10px;
}

.detail-text {
    padding: 5px;
    font-weight: normal;
    font-size: 18px;
}
</style>
