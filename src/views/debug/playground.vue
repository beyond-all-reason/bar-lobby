<route lang="json">
{ "meta": { "title": "Playground", "order": 1 } }
</route>

<template>
    <div>
        <Select :modelValue="selection" :options="selections" optionLabel="name" optionValue="value" :placeholder="selection" @update:model-value="onUpdateSelection" />
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Select from "@/components/inputs/Select.vue";

const selection = ref("blue");
const selections = ref([
    { name: "Red", value: "red" },
    { name: "Blue", value: "blue" },
    { name: "Green", value: "green" },
]);
const onUpdateSelection = (newSelection: string) => {
    selection.value = newSelection;
};
</script>

<style lang="scss" scoped></style>
