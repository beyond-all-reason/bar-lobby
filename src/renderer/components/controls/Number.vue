<template>
    <Control class="number">
        <PrimeVueInputNumber v-bind="$attrs" />
    </Control>
</template>

<script lang="ts" setup>
import { InputNumberProps } from "primevue/inputnumber";
import { computed, ref } from "vue";

import Control from "@renderer/components/controls/Control.vue";
import PrimeVueInputNumber from "@renderer/components/primevue/PrimeVueInputNumber.vue";

defineProps<InputNumberProps>();
defineEmits<{
    (event: "update:modelValue", value: number): void;
}>();

const max = ref(100);
const maxInputWidth = computed(() => `${max.value.toString().length + 1}ch`);
</script>

<style lang="scss" scoped>
:deep(.p-inputtext) {
    padding: 0 10px;
    width: v-bind(maxInputWidth);
}
:deep(.p-button) {
    margin-right: 5px;
}
</style>
