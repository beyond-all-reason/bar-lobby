<route>{ "meta": { "title": "Playground", "order": 1 } }</route>

<template>
    <div class="flex-col gap-10">
        <Progress :percent="percent" :text="progressText" />
        <div class="flex-row flex-left flex-center gap-10">
            <Button @click="clone">Fetch latest game</Button>
            <div>HEllo</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const percent = ref(0);

const clone = async () => {
    window.api.gameDownloader.fetchLatest();
    // ipcRenderer.send("clone");
    // ipcRenderer.on("clone-progress", (event, progress) => {
    //     console.log(progress);
    //     //percent.value = progress;
    // });
};

const progressText = ref("");

window.api.gameDownloader.onProgress.add((progress) => {
    percent.value = progress.percent;
    progressText.value = `${(progress.currentBytes / Math.pow(1024, 3)).toFixed(2)}GB / ${(progress.totalBytes / Math.pow(1024, 3)).toFixed(2)}GB (${(progress.percent * 100).toFixed(2)}%)`;
});
</script>