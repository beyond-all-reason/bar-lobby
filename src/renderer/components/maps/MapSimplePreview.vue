<template>
    <div class="map-container">
        <div class="map" :style="`background-image: url(${mapTextureUrl})`" />
    </div>
</template>

<script setup lang="ts">
import { MapData } from "@main/content/maps/map-data";
import { useImageBlobUrlCache } from "@renderer/composables/useImageBlobUrlCache";
import vStartBox from "@renderer/directives/vStartBox";
import vStartPos from "@renderer/directives/vStartPos";
import { computed, defineComponent } from "vue";

defineComponent({
    directives: {
        startBox: vStartBox,
        startPos: vStartPos,
    },
});

const props = defineProps<{
    map: MapData;
}>();

const { get } = useImageBlobUrlCache();

const mapTextureUrl = computed(() => {
    if (!props.map?.images) {
        return;
    }
    return get(props.map?.springName, props.map?.imagesBlob?.preview);
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
    border: 1px solid rgba(255, 255, 255, 0.1);
    background-color: rgba(0, 0, 0, 0.3);
}

.map {
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    height: 100%;
    width: 100%;
}
</style>
