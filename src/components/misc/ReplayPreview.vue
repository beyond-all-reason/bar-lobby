<template>
    <div class="flex-col gap-md">
        <!-- <MapPreview /> -->
        <Button v-if="synced" class="green" @click="watch">Watch</Button>
        <Button v-else class="blue" :disabled="contentIsDownloading" @click="downloadMissingContent">Download Missing Content</Button>

        <div>{{ mapInstalled }} / {{ replay.mapScriptName }}</div>
        <div>{{ gameInstalled }}</div>
        <div>{{ engineInstalled }}</div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import Button from "@/components/controls/Button.vue";
import { SelectableReplayData } from "@/model/replay";
//import MapPreview from "@/components/battle/MapPreview.vue";

const props = defineProps<{
    replay: SelectableReplayData;
}>();

const mapInstalled = computed(() => api.content.maps.installedMaps.some((map) => map.scriptName === props.replay.mapScriptName));
const gameInstalled = computed(() => api.content.game.installedVersions.some((version) => version === props.replay.gameVersion));
const engineInstalled = computed(() => api.content.engine.installedVersions.some((version) => version === props.replay.engineVersion));
const synced = computed(() => mapInstalled.value && gameInstalled.value && engineInstalled.value);
const contentIsDownloading = computed(() => {
    const isMapDownloading = api.content.maps.currentDownloads.some((dl) => dl.name === props.replay.mapScriptName);
    const isGameDownloading = api.content.game.currentDownloads.some((dl) => dl.name === props.replay.gameVersion);
    const isEngineDownloading = api.content.engine.currentDownloads.some((dl) => dl.name === props.replay.engineVersion);
    return isMapDownloading || isGameDownloading || isEngineDownloading;
});

const downloadMissingContent = () => {
    if (!mapInstalled.value) {
        api.content.maps.installMap(props.replay.mapScriptName);
    }
    if (!gameInstalled.value) {
        api.content.game.downloadGame(props.replay.gameVersion);
    }
    if (!engineInstalled.value) {
        api.content.engine.downloadEngine(props.replay.engineVersion);
    }
};

const watch = () => {
    api.game.launch({ replay: props.replay });
};
</script>

<style lang="scss" scoped></style>
