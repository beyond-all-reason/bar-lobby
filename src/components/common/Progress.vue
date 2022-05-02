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
import { computed, watch } from "vue";

const props = withDefaults(defineProps<{
    percent: number
    text?: string,
    themed?: boolean
    height?: number
}>(), {
    text: undefined,
    height: 15
});

const emit = defineEmits<{
    (event: "loaded", percent: number): void
}>();

const percentStr = computed(() => `--progress: ${props.percent * 100}%`);

watch(() => props.percent, (newValue, oldValue) => {
    if (oldValue < 1 && newValue >= 1) {
        emit("loaded", props.percent);
    }
});
</script>