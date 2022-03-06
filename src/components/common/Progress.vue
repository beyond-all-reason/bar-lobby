<template>
    <div class="progress" :class="{ themed: themed }" :style="percentStr">
        <div class="progress__bar" :style="`height: ${height}px`">
            <div class="progress__current" />
            <div class="fullsize progress__text">
                {{ text }}
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = withDefaults(defineProps<{
    percent: number
    text?: string,
    themed?: boolean
    height?: number
}>(), {
    text: undefined,
    height: 15
});

const percentStr = computed(() => `--progress: ${props.percent * 100}%`);
</script>