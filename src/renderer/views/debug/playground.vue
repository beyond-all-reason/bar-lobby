<route lang="json5">
{ meta: { title: "Playground", order: 1 } }
</route>

<template>
    <div>
        <Button @click="stuff">Click</Button>
    </div>
</template>

<script lang="ts" setup>
import { onKeyStroke } from "@vueuse/core";

import Button from "@/components/controls/Button.vue";

onKeyStroke("F1", stuff);

function stuff() {
    console.log("stuff");
}
</script>

<style lang="scss" scoped></style>
