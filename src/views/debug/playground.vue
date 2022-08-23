<route lang="json">
{ "meta": { "title": "Playground", "order": 1 } }
</route>

<template>
    <div>
        <Range v-model="thing" />

        <div>{{ thing }}</div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Range from "@/components/inputs/Range.vue";

const thing = ref(2);

const test = (val: number | number[]) => {
    console.log(val);
};
</script>

<style lang="scss" scoped></style>
