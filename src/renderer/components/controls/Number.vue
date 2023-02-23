<template>
    <Control class="number">
        <PrimeVueInputNumber :modelValue="modelValue" v-bind="$attrs" @update:model-value="onInput" />
    </Control>
</template>

<script lang="ts" setup>
import { InputNumberProps } from "primevue/inputnumber";
import { computed, ref } from "vue";

import Control from "@/components/controls/Control.vue";
import PrimeVueInputNumber from "@/components/primevue/PrimeVueInputNumber.vue";

export interface Props extends InputNumberProps {
    modelValue: number | undefined;
}

const props = defineProps<Props>();
const emits = defineEmits<{
    (event: "update:modelValue", value: number): void;
}>();

const max = ref(100);
const maxInputWidth = computed(() => `${max.value.toString().length + 1}ch`);

function onInput(input: number) {
    emits("update:modelValue", input);
}
</script>

<style lang="scss" scoped>
.number {
    max-height: 35px;
}
:deep(.p-inputtext) {
    padding: 0 10px;
    width: v-bind(maxInputWidth);
}
:deep(.p-button) {
    margin-right: 5px;
}
</style>
