<route lang="json">{ "meta": { "title": "Playground", "order": 1 } }</route>

<template>
    <div>
        <div>Playground</div>
        <Checkbox :model-value="test" @update:model-value="(value) => test = value" />
        {{ test }}
    </div>
</template>

<script lang="ts" setup>
import Checkbox from "@/components/inputs/Checkbox.vue";
import { ref } from "vue";

const test = ref(true);
</script>