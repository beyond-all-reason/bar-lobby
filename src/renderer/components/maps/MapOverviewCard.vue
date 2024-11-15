<template>
    <div class="map">
        <div class="background" :style="`background-image: url('${imageUrl}')`"></div>
        <div class="name">
            {{ map?.displayName }}
        </div>
        <div class="attributes">
            <div>{{ mapSize }}</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useImageBlobUrlCache } from "@renderer/composables/useImageBlobUrlCache";
import { MapData } from "@main/content/maps/map-data";
import defaultMiniMap from "/assets/images/default-minimap.png?url";

const props = defineProps<{
    map: MapData;
}>();

const cache = useImageBlobUrlCache();
const mapSize = computed(() => (props.map ? props.map.mapWidth + "x" + props.map.mapHeight : "Unknown"));
const imageUrl = computed(() =>
    props.map.imagesBlob?.preview ? cache.get(props.map.springName, props.map.imagesBlob?.preview) : defaultMiniMap
);
</script>

<style lang="scss" scoped>
.map {
    will-change: transform, opacity;
    aspect-ratio: 1;
    position: relative;
    overflow: hidden;
    &:after {
        @extend .fullsize;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-shadow:
            inset 0 1px 0 rgba(0, 0, 0, 0.3),
            inset 0 -1px 0 rgba(0, 0, 0, 0.3),
            inset 1px 0 0 rgba(0, 0, 0, 0.3),
            inset -1px 0 0 rgba(0, 0, 0, 0.3);
        border: 3px solid rgba(0, 0, 0, 0.2);
        z-index: 5;
    }
    &:hover {
        .name {
            opacity: 0;
        }
        .background {
            transform: scale(1.01);
            &:after {
                opacity: 0;
            }
        }
        .attributes {
            opacity: 0;
        }
    }
}
.background {
    position: absolute;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    position: relative;
    transform: scale(1.1);
    transition: 0.1s transform;
    will-change: transform;
    z-index: 0;
    &:after {
        @extend .fullsize;
        z-index: 1;
        background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0));
        transition: 0.1s opacity;
    }
    transition: background-image 0.1s ease-in-out;
}
.name {
    @extend .fullsize;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    word-break: break-word;
    padding: 10px;
    font-size: 38px;
    font-weight: 600;
    text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.5);
    transition: 0.2s opacity;
}
.attributes {
    position: absolute;
    bottom: 10px;
    left: 10px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(0, 0, 0, 0.2);
    font-size: 16px;
    font-weight: 600;
    padding: 2px 5px;
    transition: 0.2s opacity;
}
</style>
