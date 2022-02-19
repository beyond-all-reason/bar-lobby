<route lang="json">{ "meta": { "empty": true } }</route>

<template>
    <div>Index</div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";

const router = useRouter();

router.replace("/updater");
</script>