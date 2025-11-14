<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="map-container">
        <div class="map" :style="{ 'background-image': `url(${imageUrl})`, 'background-position': alignment }" />
    </div>
</template>

<script setup lang="ts">
import { useImageBlobUrlCache } from "@renderer/composables/useImageBlobUrlCache";
import { db } from "@renderer/store/db";
import defaultMiniMap from "/src/renderer/assets/images/default-minimap.png?url";
import { computedAsync } from "@vueuse/core";

const props = defineProps<{
    mapName: string;
    alignment: "left" | "right" | "center";
}>();

function getMapDataFromName(mapName: string) {
    const mapData = db.maps.get(mapName);
    return mapData;
}

const cache = useImageBlobUrlCache();

const imageUrl = computedAsync(async () => {
    const map = await getMapDataFromName(props.mapName);
    if (map == undefined) {
        return defaultMiniMap;
    } else {
        return map.imagesBlob?.preview ? cache.get(map.springName, map.imagesBlob?.preview) : defaultMiniMap;
    }
});
</script>

<style lang="scss" scoped>
.map-container {
    height: 100%;
    flex-grow: 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.map {
    background-size: contain;
    background-repeat: no-repeat;
    height: 48px;
    width: 100%;
    min-width: 48px;
}
</style>
