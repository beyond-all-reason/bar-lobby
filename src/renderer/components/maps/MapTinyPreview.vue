<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="map-container">
        <div class="map" :style="`background-image: url(${imageUrl})`" />
    </div>
</template>

<script setup lang="ts">
import { useImageBlobUrlCache } from "@renderer/composables/useImageBlobUrlCache";
import { db } from "@renderer/store/db";
import defaultMiniMap from "/src/renderer/assets/images/default-minimap.png?url";
import { computedAsync } from "@vueuse/core";

// TODO: Make the alignment configurable - we may want this element to be right, left, or center aligned.
// But because the maps are non-square, they are not guaranteed to visually fill the space.
// Therefore, different uses may have different preferences for the "background-position" css property

const props = defineProps<{
    mapName: string;
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
        return map.imagesBlob?.preview ? cache.get(map.springName) : defaultMiniMap;
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
    background-position: right;
    height: 48px;
    width: 100%;
    min-width: 48px;
}
</style>
