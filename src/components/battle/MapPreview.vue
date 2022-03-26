<template>
    <div class="flex-col">
        <div class="map-preview">
            <img v-if="texturePath" class="map-image" :src="texturePath">
            <img v-else class="map-image">
        </div>
        <MapToolbar />
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import MapToolbar from "@/components/battle/MapToolbar.vue";

const props = defineProps({
    filename: {
        type: String,
        required: true
    }
});

const mapImagesPath = window.api.content.maps.mapImagesPath;
const mapData = computed(() => window.api.content.maps.installedMaps[props.filename]);
const texturePath = computed(() => window.api.content.maps.getMapImagePaths(props.filename)?.texture);
</script>