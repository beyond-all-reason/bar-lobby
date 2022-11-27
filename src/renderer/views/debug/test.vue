<route lang="json">
{ "meta": { "title": "Test", "order": 2 } }
</route>

<template>
    <div>
        {{ stuff }}
    </div>
</template>

<script lang="ts" setup>
import { delay } from "jaz-ts-utils";
import { ref } from "vue";

const stuff = ref("blue");

await delay(40000);

stuff.value = "red";
</script>

<style lang="scss" scoped></style>
