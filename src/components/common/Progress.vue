<template>
    <div ref="progressEl" class="progress" :style="percentStr">
        <div class="bar">
            <div class="current"></div>
            <div class="fullsize flex-center text">{{ text }}</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps<{
    percent: number
    text?: string
}>();

const percentStr = computed(() => `${props.percent * 100}%`);
</script>