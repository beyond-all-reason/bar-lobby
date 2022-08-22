<template>
    <Control class="range">
        <Slider ref="slider" v-bind="$attrs" :modelValue="modelValue" />
        <InputNumber v-if="!Array.isArray(modelValue)" :modelValue="modelValue" :max="max" @update:modelValue="onInput" />
    </Control>
</template>

<script lang="ts" setup>
// https://primefaces.org/primevue/slider

import InputNumber from "primevue/inputnumber";
import Slider, { SliderEmits, SliderProps } from "primevue/slider";
import { computed, onMounted, Ref, ref } from "vue";

import Control from "@/components/inputs/Control.vue";

// eslint-disable-next-line
interface Props extends SliderProps {
    modelValue?: number | number[] | undefined;
}

// eslint-disable-next-line
interface Emits extends SliderEmits {
    "update:modelValue": (value: number | number[]) => void;
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

const onInput = (input: number | number[]) => {
    if (typeof input === "number" && !Array.isArray(input)) {
        emits("update:modelValue", input);
    }
};
</script>

<style lang="scss" scoped>
.range {
    width: 100%;
    align-self: center;
}
::v-deep .p-slider {
    width: 100%;
    margin: 0 15px;
    &:before {
        @extend .fullsize;
        background: #111;
        border-radius: 5px;
        overflow: hidden;
    }
    &-horizontal {
        height: 0.286rem;
    }
    &-range {
        background: #ddd;
        border-radius: 5px;
    }
    &-handle {
        top: 50%;
        height: 15px;
        width: 15px;
        background: #eee;
        border-radius: 50%;
        transform: translateX(-50%) translateY(-50%);
        transition: background-color 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
    }
    &-sliding .p-slider-handle,
    &-handle:hover {
        background-color: #fff;
    }
}
::v-deep .p-inputtext {
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
