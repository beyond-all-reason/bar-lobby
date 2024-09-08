<template>
    <Control class="range">
        <Slider ref="slider" v-bind="$attrs" :modelValue="modelValue" @update:model-value="onSlide" />
        <InputNumber v-if="typeof modelValue === 'number'" v-bind="$attrs" :modelValue="modelValue" @update:model-value="onInput" />
    </Control>
</template>

<script lang="ts" setup>
// https://primefaces.org/primevue/slider

import InputNumber from "primevue/inputnumber";
import Slider, { SliderProps } from "primevue/slider";
import { computed, onMounted, Ref, ref } from "vue";

import Control from "@/components/controls/Control.vue";

export interface Props extends SliderProps {
    modelValue: number | number[] | undefined;
}

const props = defineProps<Props>();
const emits = defineEmits<{
    (event: "update:modelValue", value: number | number[]): void;
}>();

const slider: Ref<null | Props> = ref(null);
const max = ref(100);
const maxInputWidth = computed(() => `${max.value.toString().length + 1}ch`);

onMounted(() => {
    if (slider.value?.max) {
        max.value = slider.value?.max;
    }
});

function onSlide(input: number | number[]) {
    emits("update:modelValue", input);
}

function onInput(input: number | number[]) {
    if (typeof input === "number" && !Array.isArray(input)) {
        emits("update:modelValue", input);
    }
}
</script>

<style lang="scss" scoped>
.range {
    width: 100%;
    align-self: center;
}
:deep(.p-slider) {
    position: relative;
    width: 100%;
    margin: 0 15px;
    &:before {
        @extend .fullsize;
        left: 0;
        top: 0;
        background: #111;
        border-radius: 5px;
        overflow: hidden;
    }
    &.p-slider-horizontal {
        height: 0.286rem;
    }
    .p-slider-range {
        background: #ddd;
        border-radius: 5px;
    }
    .p-slider-handle {
        top: 50%;
        height: 15px;
        width: 15px;
        background: #eee;
        border-radius: 50%;
        transform: translateX(-50%) translateY(-50%);
        transition: background-color 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
    }
    .p-slider-sliding .p-slider-handle,
    .p-slider-handle:hover {
        background-color: #fff;
    }
}
:deep(.p-inputtext) {
    width: v-bind(maxInputWidth);
    text-align: center;
}
.p-inputwrapper {
    position: relative;
    height: 100%;
    padding: 5px;
    &:before {
        position: absolute;
        height: 100%;
        width: 1px;
        left: 0;
        content: "";
        top: 0;
        background: rgba(255, 255, 255, 0.1);
    }
}
</style>
