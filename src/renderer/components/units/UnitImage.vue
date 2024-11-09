<template>
    <div class="unit-image">
        <div class="background" :style="`background-image: url('${imageUrl}')`" />
    </div>
</template>

<script lang="ts" setup>
import { Unit } from "@main/content/game/unit";
import { useImageBlobUrlCache } from "@renderer/composables/useImageBlobUrlCache";
import { computed } from "vue";

const props = defineProps<{ unit: Unit }>();

const defaultUnit = "/src/renderer/assets/temp-acc-mock/titan.png";
const cache = useImageBlobUrlCache();
const imageUrl = computed(() =>
    props.unit.imageBlobs?.preview3d
        ? cache.get(props.unit.unitId, props.unit.imageBlobs?.preview3d)
        : props.unit.imageBlobs?.preview
          ? cache.get(props.unit.unitId, props.unit.imageBlobs?.preview)
          : defaultUnit
);
</script>

<style lang="scss" scoped>
.unit-image {
    aspect-ratio: 1;
}
.background {
    position: relative;
    width: 100%;
    height: 100%;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    transform: scale(1.01);
    transition: 0.5s transform;
    will-change: transform;
    z-index: 0;
    &:after {
        @extend .fullsize;
        z-index: 1;
        transition: 0.1s opacity;
    }
    transition: background-image 5s ease-in-out;
}
</style>
