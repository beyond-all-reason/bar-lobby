<route lang="json">
{ "meta": { "title": "Playground", "order": 0 } }
</route>

<template>
    <div>
        <Select v-model="thing" :options="options" />

        <Select2 :value="thing" :options="options" :filter="true" :placeholder="thing" filterPlaceholder="Search" @update:model-value="test" />

        <Dropdown v-model="thing" :options="options" :filter="true" :placeholder="thing" filterPlaceholder="Search" @update:model-value="test" />

        <div>{{ thing }}</div>
    </div>
</template>

<script lang="ts" setup>
import Dropdown from "primevue/dropdown";
import { ref } from "vue";

import Select from "@/components/inputs/Select.vue";
import Select2 from "@/components/inputs/Select2.vue";

const thing = ref("Red");
const options = ref(["Red", "Blue", "Green"]);

const test = (a: any, b: any) => {
    thing.value = a;
    console.log(a, thing.value);
};

const test2 = (a: any, b: any) => {
    console.log(a.value);
    return options.value;
};
</script>

<style lang="scss" scoped></style>
