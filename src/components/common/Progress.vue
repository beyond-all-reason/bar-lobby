<template>
    <div ref="progressEl" class="progress">
        <div class="bar">
            <div class="current">
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { useCssVar } from "@vueuse/core";

const props = defineProps({
    percent: {
        type: Number,
        default: 0
    }
});

const progressEl = ref(null);
const percent = useCssVar("--progress", progressEl);

watch(props, () => {
    percent.value = `${props.percent * 100}%`;
});
</script>