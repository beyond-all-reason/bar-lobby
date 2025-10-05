<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->
<template>
    <Control class="range" :disabled="disabled">
        <InputNumber
            v-if="range"
            v-bind="$attrs"
            :modelValue="low"
            @update:modelValue="(input: number) => onInput([input, high ?? min])"
            @focus="(event: Event) => (event.target as HTMLInputElement)?.select()"
            class="min"
            :minFractionDigits="0"
            :maxFractionDigits="maxFractionDigits"
            :step="stepValue"
            mode="decimal"
            :useGrouping="false"
        />
        <Slider v-bind="$props" :modelValue="modelValue" @update:modelValue="onSlide" />
        <InputNumber
            v-bind="$attrs"
            :modelValue="typeof modelValue === 'number' ? modelValue : high"
            @update:modelValue="(input: number) => (typeof modelValue === 'number' ? onInput(input) : onInput([low ?? min, input]))"
            @focus="(event: Event) => (event.target as HTMLInputElement)?.select()"
            class="max"
            :minFractionDigits="0"
            :maxFractionDigits="maxFractionDigits"
            :step="stepValue"
            mode="decimal"
            :useGrouping="false"
        />
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

const stepValue = computed(() => props.step ?? 1);
const maxFractionDigits = computed(() => {
    const step = stepValue.value.toString();
    const decimalIndex = step.indexOf(".");
    return decimalIndex === -1 ? 0 : step.length - decimalIndex - 1;
});

function onSlide(input: number | number[]) {
    emits("update:modelValue", input);
}

function onInput(input: number | number[]) {
    const clamp = (v: number) => Math.max(props.min ?? 0, Math.min(props.max ?? 100, v));
    emits("update:modelValue", Array.isArray(input) ? input.map(clamp).sort((a, b) => a - b) : clamp(input));
}
</script>

<style lang="scss" scoped>
.range {
    width: 100%;
    align-self: center;
    .disabled {
        opacity: 0.4;
    }
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
