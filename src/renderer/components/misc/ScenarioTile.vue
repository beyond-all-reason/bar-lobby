<template>
    <div class="scenario-tile">
        <div class="title">
            {{ scenario.title }}
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import { Scenario } from "@/model/scenario";

const props = defineProps<{
    scenario: Scenario;
}>();

const backgroundImageCss = computed(() => `url('${props.scenario.imagepath}')`);
</script>

<style lang="scss" scoped>
.scenario-tile {
    height: 200px;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    position: relative;
    //border-top: 1px solid rgba(255, 255, 255, 0.3);
    border: 4px solid rgba(0, 0, 0, 0.2);
    outline: 1px solid rgba(255, 255, 255, 0.1);
    outline-offset: -1px;
    overflow: hidden;
    transition: 0.1s all;
    will-change: outline;
    &:before {
        @extend .fullsize;
        background-image: v-bind(backgroundImageCss);
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
        transform: scale(1.1);
        transition: 0.1s all;
        filter: brightness(1) contrast(1);
        will-change: transform, filter;
    }
    &:after {
        @extend .fullsize;
        z-index: 1;
        background: linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.7));
        outline: 1px solid rgba(255, 255, 255, 0.15);
        outline-offset: -1px;
    }
    &:hover,
    &.selected {
        &:before {
            transform: scale(1);
            filter: brightness(1.5) contrast(1.1);
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
    width: 100%;
}
</style>
