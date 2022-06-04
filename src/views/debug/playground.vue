<route lang="json">
{ "meta": { "title": "Playground", "order": 0 } }
</route>

<template>
    <div>
        <!-- <Select :value="thing" :options="['red', 'blue', 'yellow']" @update:modelValue="test" /> -->

        {{ thing }}
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const thing = ref("red");

const test = (a: any, b: any) => {
    console.log(thing.value);
};
</script>

<style lang="scss" scoped></style>
