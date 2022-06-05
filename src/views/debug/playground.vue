<route lang="json">
{ "meta": { "title": "Playground", "order": 0 } }
</route>

<template>
    <div>
        <Select :value="thing" :options="['red', 'blue', 'yellow']" @update:model-value="test" />

        <select>
            <option value="red">Red</option>
            <option value="blue">Blue</option>
            <option value="yellow">Yellow</option>
        </select>

        {{ thing }}
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Select from "@/components/inputs/Select.vue";

const thing = ref("red");

const test = (a: any, b: any) => {
    console.log(a, thing.value);
};
</script>

<style lang="scss" scoped></style>
