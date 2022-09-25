<route lang="json">
{ "meta": { "title": "A", "order": 3 } }
</route>

<template>
    <div>
        <Select v-model="color" :options="colors" />
    </div>
</template>

<script lang="ts" setup>
import { delay } from "jaz-ts-utils";
import { ref } from "vue";

import Select from "@/components/controls/Select.vue";

const color = ref("red");
const colors = ref(["red", "green", "blue"]);

await delay(1000);
</script>

<style lang="scss" scoped></style>
