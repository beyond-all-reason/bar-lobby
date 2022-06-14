<route lang="json">
{ "meta": { "title": "Playground", "order": 0 } }
</route>

<template>
    <div>
        <Range2 v-model="thing" />

        <div>{{ thing }}</div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Range2 from "@/components/inputs/Range2.vue";

const thing = ref(2);

const test = (val: number | number[]) => {
    console.log(val);
};
</script>

<style lang="scss" scoped></style>
