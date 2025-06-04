<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="progress" :class="{ themed: themed, pulse: pulsating }" :style="percentStr">
        <div class="progress__bar" :style="`height: ${height}px`">
            <div class="progress__current" />
            <div class="progress__text">
                {{ text }}
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, watch } from "vue";

const props = withDefaults(
    defineProps<{
        percent: number;
        text?: string;
        themed?: boolean;
        height?: number;
        pulsating?: boolean;
    }>(),
    {
        text: undefined,
        height: 15,
    }
);

const emit = defineEmits<{
    (event: "loaded", percent: number): void;
}>();

const percentStr = computed(() => `--progress: ${props.percent * 100}%`);

watch(
    () => props.percent,
    (newValue, oldValue) => {
        if (oldValue < 1 && newValue >= 1) {
            emit("loaded", props.percent);
        }
    }
);
</script>

<style lang="scss" scoped>
.progress {
    --progress: 0%;
    display: flex;
    align-items: center;
    &__bar {
        position: relative;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.1);
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.15);
    }
    &__current {
        width: var(--progress);
        height: 100%;
        background: rgba(255, 255, 255, 0.3);
    }
    &.themed .progress__current {
        background: linear-gradient(rgba(217, 255, 0, 0.5) 0%, rgba(217, 255, 0, 0.5) 50%, rgba(194, 228, 0, 0.5) 51%);
        border-top: 1px solid rgba(255, 255, 255, 0.3);
        transition: width 1s ease;
    }
    &.pulse .progress__current {
        animation: pulse 1s infinite;
    }
    &__text {
        @extend .fullsize;
        top: 1px;
        left: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 14px;
    }
}
</style>
