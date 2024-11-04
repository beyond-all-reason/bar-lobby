<route lang="json5">
{ props: true, meta: { title: "Map Details", hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <Panel class="flex-grow">
            <div v-if="map" class="gap-md page">
                <h1>{{ map.displayName }}</h1>
                <div class="container">
                    <MapSimplePreview :map="map" />
                    <div class="details">
                        <div class="detail-text"><b>Description:</b> {{ map.description }}</div>
                        <!-- <div v-if="map.mapInfo?.author" class="detail-text"><b>Author:</b> {{ map.mapInfo.author }}</div>
                        <div class="detail-text"><b>Size:</b> {{ map.width }} x {{ map.height }}</div>
                        <div class="detail-text"><b>Wind:</b> {{ map.minWind }} - {{ map.maxWind }}</div>
                        <div class="detail-text"><b>Tidal:</b> {{ map.tidalStrength }}</div>
                        <div class="detail-text"><b>Gravity:</b> {{ map.gravity }}</div>
                        <div class="detail-text"><b>Depth:</b> {{ map.minDepth }} - {{ map.maxDepth }}</div>
                        <div class="detail-text"><b>Hardness:</b> {{ map.mapHardness }}</div> -->
                        <!-- <div v-if="map.startPositions" class="detail-text"><b>Start Positions:</b> {{ map.startPositions.length }}</div> -->
                        <Button v-if="map.isInstalled" class="green inline" @click="play">Play</Button>
                        <Button v-else-if="map.isDownloading" class="green inline" disabled>Downloading map...</Button>
                        <Button v-else class="red inline" @click="downloadMap(map.springName)">Download</Button>
                    </div>
                </div>
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
import Button from "@renderer/components/controls/Button.vue";
import { db } from "@renderer/store/db";
import { battleActions } from "@renderer/store/battle.store";
import { useRouter } from "vue-router";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { downloadMap } from "@renderer/store/maps.store";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import Panel from "@renderer/components/common/Panel.vue";
import MapPreview from "@renderer/components/maps/MapBattlePreview.vue";
import MapSimplePreview from "@renderer/components/maps/MapSimplePreview.vue";

const router = useRouter();
const { id } = defineProps<{
    id: string;
}>();

const map = useDexieLiveQueryWithDeps([() => id], () => db.maps.get(id));

async function play() {
    battleActions.resetToDefaultBattle(enginesStore.latestEngineVersion, gameStore.latestGameVersion, map.value);
    router.push("/singleplayer/custom");
}
</script>

<style lang="scss" scoped>
.view {
    padding: 20px;
    overflow: hidden;
}

.page {
    height: 100%;
    max-height: 100%;
    display: flex;
    flex-direction: column;
}

.container {
    display: flex;
    flex-direction: row;
    gap: 15px;
    height: 100%;
}

.details {
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 512px;
}
</style>
