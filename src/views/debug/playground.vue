<route lang="json">
{ "meta": { "title": "Playground", "order": 0 } }
</route>

<template>
    <div>
        {{ stuff }}
    </div>
</template>

<script lang="ts" setup>
import { delay } from "jaz-ts-utils";
import { ref } from "vue";

const stuff = ref("hello");

await delay(4000);

stuff.value = "world";
</script>

<style lang="scss" scoped></style>
