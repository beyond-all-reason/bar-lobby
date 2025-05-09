<route lang="json5">
{ props: true, meta: { title: "Map Details", hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="map-details-container">
            <Panel class="flex-grow">
                <div v-if="map" class="gap-md page">
                    <div class="gridform">
                        <h1>{{ map.displayName }}</h1>
                        <div class="flex-right">
                            <Button v-tooltip.bottom="'Back'" class="icon close flex-right" @click="returnToMaps">
                                <Icon :icon="arrow_back" :height="40" />
                            </Button>
                        </div>
                    </div>
                    <div class="container">
                        <MapSimplePreview :map="map" />
                        <div class="details">
                            <div class="detail-text"><b>Description:</b> {{ map.description }}</div>
                            <div v-if="map.author" class="detail-text"><b>Author:</b> {{ map.author }}</div>
                            <div class="detail-text"><b>Size:</b> {{ map.mapWidth }} x {{ map.mapHeight }}</div>
                            <div class="detail-text"><b>Wind:</b> {{ map.windMin }} - {{ map.windMax }}</div>
                            <div class="detail-text"><b>Tidal:</b> {{ map.tidalStrength }}</div>
                            <!-- <div v-if="map.startPositions" class="detail-text"><b>Start Positions:</b> {{ map.startPositions.length }}</div> -->
                            <div class="gridform">
                                <Button
                                    @click="toggleMapFavorite"
                                    v-if="!map.isFavorite"
                                    class="icon"
                                    v-tooltip.bottom="'Add to favorites'"
                                >
                                    <Icon :icon="heart_plus" :height="33" />
                                </Button>
                                <Button
                                    @click="toggleMapFavorite"
                                    v-if="map.isFavorite"
                                    class="icon"
                                    v-tooltip.bottom="'Remove from favorites'"
                                >
                                    <Icon :icon="heart_minus" :height="33" />
                                </Button>
                                <Button v-if="map.isInstalled" class="green inline" @click="play">Play</Button>
                                <Button v-else-if="map.isDownloading" class="green inline" disabled>Downloading map...</Button>
                                <Button v-else class="red inline" @click="downloadMap(map.springName)">Download</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Panel>
        </div>
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
import MapSimplePreview from "@renderer/components/maps/MapSimplePreview.vue";
import { Icon } from "@iconify/vue";
import arrow_back from "@iconify-icons/mdi/arrow-back";
import heart_plus from "@iconify-icons/mdi/heart-plus";
import heart_minus from "@iconify-icons/mdi/heart-minus";

const router = useRouter();
const { id } = defineProps<{
    id: string;
}>();

const map = useDexieLiveQueryWithDeps([() => id], () => db.maps.get(id));

async function play() {
    battleActions.resetToDefaultBattle(enginesStore.getEngineVersion(), gameStore.selectedGameVersion, map.value);
    router.push("/singleplayer/custom");
}

function toggleMapFavorite() {
    db.maps.update(id, { isFavorite: !map.value?.isFavorite });
    if (map.value) map.value.isFavorite = !map.value.isFavorite;
}

function returnToMaps() {
    router.push("/library/maps/maps");
}
</script>

<style lang="scss" scoped>
.map-details-container {
    display: flex;
    align-self: center;
    height: 100%;
    width: 1600px;
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
