<route>{ "meta": { "title": "Playground", "order": 1 } }</route>

<template>
    <div>
        <Button @click="clone">Clone</Button>
        <Progress :percent="percent" />
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const clone = async () => {
    window.api.gameDownloader.fetchLatest();
};

const percent = ref(0);

window.api.gameDownloader.onProgress.disposeAll();
window.api.gameDownloader.onProgress.add((progress) => {
    percent.value = progress;
});
</script>