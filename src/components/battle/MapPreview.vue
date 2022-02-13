<template>
    <div class="map-preview">
        <img class="map-image" :src="texturePath">
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps({
    filename: {
        type: String,
        required: true
    }
});

const mapImagesPath = window.api.content.maps.getMapImagesPath();
const mapData = computed(() => window.api.content.maps.getMapByFilename(props.filename));
const texturePath = computed(() => window.api.content.maps.getMapImages(props.filename)?.texture);
</script>