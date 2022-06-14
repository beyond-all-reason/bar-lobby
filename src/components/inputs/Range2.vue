<template>
    <Control class="range">
        <Slider v-bind="$attrs" v-model="internalValue" @update:model-value="onUpdate" />
    </Control>
</template>

<script lang="ts">
export default {
    inheritAttrs: false,
};
</script>

<script lang="ts" setup>
import Slider from "primevue/slider";
import { ref, watch } from "vue";

import Control from "@/components/inputs/Control.vue";

const props = defineProps<{
    modelValue?: number | number[];
    value?: number | number[];
}>();

const emits = defineEmits<{
    (event: "update:modelValue", value: number | number[]): void;
}>();

const internalValue = ref(props.modelValue ?? props.value);
if (props.modelValue !== undefined) {
    watch(
        () => props.modelValue,
        (newVal) => {
            internalValue.value = newVal;
        }
    );
} else if (props.value !== undefined) {
    watch(
        () => props.value,
        (newVal) => {
            internalValue.value = newVal;
        }
    );
}

const onUpdate = (newVal: number | number[]) => {
    if (props.modelValue !== undefined) {
        internalValue.value = newVal;
        emits("update:modelValue", newVal);
    } else {
        emits("update:modelValue", newVal);
    }
};
</script>

<style lang="scss" scoped>
.range {
    padding: 0 15px;
}
::v-deep .p-slider {
    width: 100%;
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
</style>
