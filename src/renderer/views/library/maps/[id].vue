<route lang="json5">
{ props: true, meta: { title: "Map Details", hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <Panel class="flex-grow">
            <div v-if="map" class="gap-md page">
                <h1>{{ map.friendlyName }}</h1>

                <div class="container">
                    <div class="map-preview-container">
                        <MapPreview :map="map" />
                    </div>

                    <div class="details">
                        <div class="detail-text"><b>Description:</b> {{ map.description }}</div>
                        <div v-if="map.mapInfo?.author" class="detail-text"><b>Author:</b> {{ map.mapInfo.author }}</div>
                        <div class="detail-text"><b>Size:</b> {{ map.width }} x {{ map.height }}</div>
                        <div class="detail-text"><b>Wind:</b> {{ map.minWind }} - {{ map.maxWind }}</div>
                        <div class="detail-text"><b>Tidal:</b> {{ map.tidalStrength }}</div>
                        <div class="detail-text"><b>Gravity:</b> {{ map.gravity }}</div>
                        <div class="detail-text"><b>Depth:</b> {{ map.minDepth }} - {{ map.maxDepth }}</div>
                        <div class="detail-text"><b>Hardness:</b> {{ map.mapHardness }}</div>
                        <div v-if="map.startPositions" class="detail-text"><b>Start Positions:</b> {{ map.startPositions.length }}</div>

                        <Button class="green inline" @click="play">Play</Button>
                    </div>
                </div>
            </div>
            <div v-else class="flex-col gap-md">
                <div>
                    Map <strong>{{ id }}</strong> is not installed.
                </div>
                <Button class="green" style="align-self: flex-start" @click="downloadMap">Download</Button>
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
/*
 * TODO:
 * Switch map preview between types
 * - Metal
 * - Height
 * - Type?
 * - 3D model
 * Back button to return to map list
 */

import { ref, watch } from "vue";

import Button from "@renderer/components/controls/Button.vue";
import MapPreview from "@renderer/components/maps/MapPreview.vue";
import { MapData } from "@main/content/maps/map-data";
import Panel from "@renderer/components/common/Panel.vue";
import { db } from "@renderer/store/db";
import { battleActions } from "@renderer/store/battle.store";
import { useRouter } from "vue-router";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";

const router = useRouter();

const props = defineProps<{
    id: string;
}>();

const map = ref<MapData>();
watch(
    () => props.id,
    async () => {
        map.value = await db.maps.get(props.id);
    },
    { immediate: true }
);

async function downloadMap() {
    // await api.content.maps.downloadMap(props.id);
}

async function play() {
    battleActions.resetToDefaultBattle(enginesStore.latestEngineVersion, gameStore.latestGameVersion, map.value);
    router.push("/singleplayer/custom");
}
</script>

<style lang="scss" scoped>
.view {
    padding: 20px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 10px;
    overflow: hidden;
}

.page {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 100%;
}

.container {
    display: flex;
    flex-direction: row;
    gap: 15px;
    height: 100%;
}

.map-preview-container {
    height: 100%;
    aspect-ratio: 1;
}

.details {
    display: flex;
    flex-direction: column;
    gap: 5px;
}
</style>
