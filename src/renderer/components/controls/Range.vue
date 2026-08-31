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
        <Slider
            v-bind="sliderProps"
            :modelValue="modelValue"
            @pointerdown="dragging = true"
            @update:modelValue="onSlide"
            @slideend="onSlideEnd"
        />
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
import { computed, ref } from "vue";
// https://v3.primevue.org/slider/
import InputNumber from "primevue/inputnumber";
import Slider, { type SliderProps } from "primevue/slider";

import Control from "@renderer/components/controls/Control.vue";
import { useEventListener } from "@vueuse/core";

// commitOnRelease emits `preview` while the handle moves and commits only on release.
export type Props = SliderProps & { commitOnRelease?: boolean };

const props = defineProps<Props>();
const emits = defineEmits<{
    (event: "update:modelValue", value: number | number[]): void;
    (event: "preview", value: number | number[]): void;
}>();

// Slider has no commitOnRelease of its own, so passing it on would leave it on the element.
const sliderProps = computed(() => {
    const forwarded: Record<string, unknown> = { ...props };
    delete forwarded.commitOnRelease;

    return forwarded as SliderProps;
});

const low = computed(() => (props.modelValue instanceof Array ? props.modelValue[0] : null));
const high = computed(() => (props.modelValue instanceof Array ? props.modelValue[1] : null));

const min = computed<number>(() => props?.min ?? 0);

const stepValue = computed(() => props.step ?? 1);
const maxFractionDigits = computed(() => {
    const step = stepValue.value.toString();
    const decimalIndex = step.indexOf(".");
    return decimalIndex === -1 ? 0 : step.length - decimalIndex - 1;
});

// Slider reports slideend only for a drag, so a track click or an arrow key would otherwise
// preview a value it never commits.
const dragging = ref(false);
useEventListener(document, "pointerup", () => (dragging.value = false));
useEventListener(document, "pointercancel", () => (dragging.value = false));

function onSlide(input: number | number[]) {
    emits("preview", input);
    if (props.commitOnRelease && dragging.value) return;

    emits("update:modelValue", input);
}

function onSlideEnd({ value }: { value: number | number[] }) {
    if (!props.commitOnRelease) return;

    emits("update:modelValue", value);
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
.min :deep(.p-inputtext),
.max :deep(.p-inputtext) {
    width: 4ch;
    text-align: center;
}
.p-inputwrapper {
    position: relative;
    height: 100%;
    padding: 5px;
    // Sized by its input, so the slider gets the rest of the row rather than sharing it.
    flex: 0 0 auto;
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
