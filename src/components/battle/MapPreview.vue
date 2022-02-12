<template>
    <div class="map-preview">
        <img class="map-image" :src="texturePath">
    </div>
</template>

<script lang="ts" setup>
import { api } from "@/api/api";
import { computed } from "vue";

const props = defineProps({
    filename: {
        type: String,
        required: true
    }
});

const mapImagesPath = api.content.maps.getMapImagesPath();
const mapData = computed(() => api.content.maps.getMapByFilename(props.filename));
const texturePath = computed(() => api.content.maps.getMapImages(props.filename)?.texture);
console.log(texturePath.value);
</script>