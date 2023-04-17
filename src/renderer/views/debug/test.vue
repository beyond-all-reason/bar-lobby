<route lang="json5">
{ meta: { title: "Test", order: 2 } }
</route>

<template>
    <div class="test">{{ txt }}</div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const txt = ref("this is a test\nlol");
//txt.value = txt.value.replaceAll("\n", "<br>");
</script>

<style lang="scss" scoped>
.test {
    white-space: pre;
}
</style>
