<template>
    <Modal name="downloads">
        <div v-if="downloads.length" class="downloads">
            <div v-for="(download, i) in downloads" :key="i" class="download">
                <div class="download__type">{{ download.type }}</div>
                <div class="download__name">{{ download.name }}</div>
                <Progress :percent="download.currentBytes / download.totalBytes" themed />
            </div>
        </div>
        <div v-else>
            No downloads active
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import Modal from "@/components/common/Modal.vue";
import Progress from "@/components/common/Progress.vue";
import { computed } from "vue";

const emits = defineEmits<{
    (e: "percentChange", newPercent: number): void;
}>();

const downloads = computed(() => {
    return [
        ...window.api.content.engine.currentDownloads,
        ...window.api.content.game.currentDownloads,
        ...window.api.content.maps.currentDownloads,
    ];
});

// const currentEngine = computed(() => lastInArray(window.api.content.engine.installedVersions));
// const engineDl = window.api.content.engine.currentDownload;

// const currentGame = computed(() => lastInArray(window.api.content.game.installedVersions).version.fullString);
// const gameDl = window.api.content.game.currentDownload;

// TODO
// const router = useRouter();
// const text = ref("Fetching latest game updates");
// const percent = ref(0);

// window.api.content.game.onDlProress.add(progress => {
//     percent.value = progress.currentBytes / progress.totalBytes;
// });

// window.api.content.engine.onDlProgress.add(progress => {
//     percent.value = progress.currentBytes / progress.totalBytes;
// });
// const isLatestGameVersionInstalled = await window.api.content.game.isLatestGameVersionInstalled();
// if (!isLatestGameVersionInstalled) {
//     await window.api.content.game.updateGame();
// } else {
//     console.log("Latest game version already installed");
// }

// text.value = "Fetching latest engine updates";

// const isLatestEngineVersionInstalled = await window.api.content.engine.isLatestEngineVersionInstalled();
// if (!isLatestEngineVersionInstalled) {
//     await window.api.content.engine.downloadLatestEngine();
// } else {
//     console.log("Latest engine version already installed");
// }

// window.api.content.maps.downloadMaps(defaultMaps);
</script>