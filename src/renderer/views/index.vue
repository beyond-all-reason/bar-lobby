<route lang="json5">
{ meta: { empty: true } }
</route>

<template>
    <div />
</template>

<script lang="ts" setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
onMounted(async () => {
    router.replace("/login");
});
</script>

<style lang="scss" scoped></style>
