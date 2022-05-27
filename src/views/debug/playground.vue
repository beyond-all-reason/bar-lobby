<route lang="json">
{ "meta": { "title": "Playground", "order": 0 } }
</route>

<template>
    <div>
        <Button @click="error">Error</Button>
    </div>
</template>

<script lang="ts" setup>
import Button from "@/components/inputs/Button.vue";
import { FatalError } from "@/model/errors";

const error = () => {
    throw new FatalError("Error", "This is a test error");
};
</script>

<style lang="scss" scoped></style>
