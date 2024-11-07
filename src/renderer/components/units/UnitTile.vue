<template>
    <div class="unit-tile">
        <div class="title">
            {{ unit.unitId }}
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Unit } from "@main/content/game/unit";
import { ref } from "vue";

const props = defineProps<{
    unit: Unit;
}>();

console.log("unit", props.unit);

const backgroundImageCss = ref(`url('/src/renderer/assets/temp-acc-mock/titan.png')`);
</script>

<style lang="scss" scoped>
.unit-tile {
    height: 200px;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    position: relative;
    border: 4px solid rgba(0, 0, 0, 0.2);
    outline: 1px solid rgba(255, 255, 255, 0.1);
    outline-offset: -1px;
    overflow: hidden;
    transition: 0.1s all;
    will-change: outline;
    &:before {
        @extend .fullsize;
        background-image: v-bind("backgroundImageCss");
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
        transform: scale(1.1);
        transition: 0.1s all;
        filter: saturate(0) brightness(0.8) contrast(1);
        will-change: transform, filter;
    }
    &:after {
        @extend .fullsize;
        z-index: 1;
        background: linear-gradient(rgba(0, 0, 0, 0) 70%, rgba(0, 0, 0, 0.9));
        outline: 1px solid rgba(255, 255, 255, 0.15);
        outline-offset: -1px;
        transition: 0.1s all;
    }
    &:hover,
    &.selected {
        &:before {
            transform: scale(1);
            filter: saturate(1) brightness(1.1) contrast(1.1);
        }
        outline: 1px solid rgba(255, 255, 255, 0.5);
    }
}
.title {
    font-size: 24px;
    text-align: left;
    font-weight: 500;
    z-index: 2;
    padding: 10px;
    padding-bottom: 6px;
    width: 100%;
    transition: 0.1s all;
}
</style>
