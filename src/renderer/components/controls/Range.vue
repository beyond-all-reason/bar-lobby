<template>
    <Control class="range">
        <InputNumber
            v-if="range"
            v-bind="$attrs"
            :modelValue="low"
            @update:modelValue="(input: number) => onInput([input, high])"
            class="min"
        />
        <Slider v-bind="$props" :modelValue="modelValue" @update:modelValue="onSlide" />
        <InputNumber
            v-bind="$attrs"
            :modelValue="typeof modelValue === 'number' ? modelValue : high"
            @update:modelValue="typeof modelValue === 'number' ? onInput : (input: number) => onInput([low, input])"
            class="max"
        />
        <!-- <InputNumber
            v-if="!range && typeof modelValue === 'number'"
            v-bind="$attrs"
            :modelValue="typeof modelValue === 'number' ? modelValue : high"
            @update:modelValue="onInput"
            class="max"
        />
        <InputNumber
            v-if="range"
            v-bind="$attrs"
            :modelValue="high"
            @update:modelValue="(input: number) => onInput([low, input])"
            class="max"
        /> -->
    </Control>
</template>

<script lang="ts" setup>
import { computed } from "vue";
// https://v3.primevue.org/slider/
import InputNumber from "primevue/inputnumber";
import Slider, { type SliderProps } from "primevue/slider";

import Control from "@renderer/components/controls/Control.vue";

export type Props = SliderProps;

const props = defineProps<Props>();
const emits = defineEmits<{
    (event: "update:modelValue", value: number | number[]): void;
}>();

const low = computed(() => (props.modelValue instanceof Array ? props.modelValue[0] : null));
const high = computed(() => (props.modelValue instanceof Array ? props.modelValue[1] : null));

const min = computed<number>(() => props?.min ?? 0);
const minInputWidth = computed(() => `${min.value.toString().length + 1}ch`);
const max = computed<number>(() => props?.max ?? 100);
const maxInputWidth = computed(() => `${max.value.toString().length + 1}ch`);

function onSlide(input: number | number[]) {
    emits("update:modelValue", input);
}

function onInput(input: number | number[]) {
    emits("update:modelValue", input);
}
</script>

<style lang="scss" scoped>
.range {
    width: 100%;
    align-self: center;
}
:deep(.p-slider) {
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
        transition:
            background-color 0.2s,
            color 0.2s,
            border-color 0.2s,
            box-shadow 0.2s;
    }
    .p-slider-sliding .p-slider-handle,
    .p-slider-handle:hover {
        background-color: #fff;
    }
}
.min :deep(.p-inputtext) {
    width: v-bind(minInputWidth);
    text-align: center;
}
.max :deep(.p-inputtext) {
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
    &.min:before {
        left: unset;
        right: 0;
    }
}
</style>
