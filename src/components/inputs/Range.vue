<template>
    <Control class="range">
        <Slider ref="slider" v-bind="$attrs" v-model="internalValue" @update:model-value="onUpdate" />
        <InputNumber v-if="!Array.isArray(internalValue)" v-model="internalValue" :max="max" />
    </Control>
</template>

<script lang="ts" setup>
import InputNumber from "primevue/inputnumber";
import Slider from "primevue/slider";
import { computed, onMounted, Ref, ref, watch } from "vue";

import Control from "@/components/inputs/Control.vue";

const props = defineProps<{
    modelValue?: number | number[];
    value?: number | number[];
}>();

const emits = defineEmits<{
    (event: "update:modelValue", value: number | number[]): void;
}>();

const slider: Ref<null | Slider["$props"]> = ref(null);
const max = ref(100);
const maxInputWidth = computed(() => `${max.value.toString().length + 1}ch`);

onMounted(() => {
    if (slider.value?.max) {
        max.value = slider.value?.max;
    }
});

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
    width: 100%;
    gap: 10px;
    align-self: center;
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
::v-deep .p-inputtext {
    width: v-bind(maxInputWidth);
    text-align: center;
}
.p-inputwrapper {
    margin-left: 15px;
    &:before {
        position: absolute;
        height: 100%;
        width: 1px;
        content: "";
        top: 0;
        margin-left: -10px;
        background: rgba(255, 255, 255, 0.1);
    }
}
</style>
