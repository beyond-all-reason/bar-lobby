<template>
    <div ref="progressEl" class="progress">
        <div class="bar">
            <div class="current"></div>
            <div class="fullsize flex-center text">{{ text }}</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, defineProps } from "vue";
import { useCssVar } from "@vueuse/core";

const props = defineProps({
    percent: {
        type: Number,
        default: 0
    },
    text: String
});

const progressEl = ref(null);
const percentStr = useCssVar("--progress", progressEl);

watch(props, () => {
    percentStr.value = `${props.percent * 100}%`;
});
</script>