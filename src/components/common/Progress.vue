<template>
    <div class="progress" :class="{ themed: themed }" :style="percentStr">
        <div class="bar" :style="`height: ${height}px`">
            <div class="current"></div>
            <div class="fullsize flex-center text">{{ text }}</div>
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
    height: 10
});

const percentStr = computed(() => `--progress: ${props.percent * 100}%`);
</script>