<template>
    <div class="map">
        <div class="background" :style="`background-image: url('${mapTextureImage}')`"></div>
        <div class="name">
            {{ map.friendlyName }}
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import { MapData } from "@/model/map-data";

const props = defineProps<{
    map: MapData;
}>();

const mapTextureImage = computed(() => api.content.maps.getMapImages(props.map).textureImagePath);
</script>

<style lang="scss" scoped>
.map {
    aspect-ratio: 1;
    position: relative;
    overflow: hidden;
    &:after {
        @extend .fullsize;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-shadow: inset 0 1px 0 rgba(0, 0, 0, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.3), inset 1px 0 0 rgba(0, 0, 0, 0.3),
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
    transition: 0.2s transform;
    will-change: transform;
    z-index: 0;
    &:after {
        @extend .fullsize;
        z-index: 1;
        background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0));
        transition: 0.2s opacity;
    }
}
.name {
    z-index: 21;
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
</style>
