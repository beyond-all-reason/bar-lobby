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

const mapImagesPath = window.api.content.getMapImagesPath();
const mapData = computed(() => window.api.content.getMapByFilename(props.filename));
const texturePath = computed(() => window.api.content.getMapImages(props.filename)?.texture);
console.log(texturePath.value);
</script>