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
                        <div class="flex-row flex-space-between">
                            <div class="flex-row gap-lg flex-center-items"></div>
                            <div class="flex-row flex-justify-end">
                                <div class="flex-row flex-center-items gap-sm"></div>
                            </div>
                        </div>
                        <div class="info">
                            <div class="details">
                                <div class="detail-text"><b>Description:</b> {{ map.description }}</div>
                                <div v-if="map.author" class="detail-text"><b>Author:</b> {{ map.author }}</div>
                                <h3>Map Properties</h3>
                                <div class="flex-row flex-center-items gap-sm">
                                    <Icon :icon="windPower" width="25" height="25" />{{ map.windMin }} - {{ map.windMax }}
                                </div>
                                <div class="flex-row flex-center-items gap-sm">
                                    <Icon :icon="waves" width="25" height="25" />{{ map.tidalStrength }}
                                </div>
                                <div class="flex-row flex-center-items gap-sm">
                                    <Icon :icon="personIcon" width="25" height="25" />{{ map?.playerCountMin }} - {{ map?.playerCountMax }}
                                </div>
                                <div class="flex-row flex-center-items gap-sm">
                                    <Icon :icon="gridIcon" width="25" height="25" />{{ map?.mapWidth }} x {{ map?.mapHeight }}
                                </div>
                                <div class="mt-5">
                                    <div class="detail-text flex-row gap-sm">
                                        <TerrainIcon v-for="terrain in map?.terrain" :terrain="terrain" v-bind:key="terrain" />
                                    </div>
                                </div>
                            </div>
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
							<div class="padding-top-md padding-bottom-md">
								<Progress :class="{ pulse: isDownloading }" :percent="downloadPercent" v-if="isDownloading" :text="(downloadPercent * 100).toFixed(0) + '%'"></Progress>
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
import Progress from "@renderer/components/common/Progress.vue";
import MapSimplePreview from "@renderer/components/maps/MapSimplePreview.vue";
import TerrainIcon from "@renderer/components/maps/filters/TerrainIcon.vue";
import { Icon } from "@iconify/vue";
import arrow_back from "@iconify-icons/mdi/arrow-back";
import heart_plus from "@iconify-icons/mdi/heart-plus";
import heart_minus from "@iconify-icons/mdi/heart-minus";
import personIcon from "@iconify-icons/mdi/person-multiple";
import waves from "@iconify-icons/mdi/waves";
import gridIcon from "@iconify-icons/mdi/grid";
import windPower from "@iconify-icons/mdi/wind-power";
import { downloadsStore } from "@renderer/store/downloads.store";
import { ref, computed } from "vue";


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

const isDownloading = computed(() => downloadsStore.mapDownloads.length > 0);

const downloadPercent = computed(() => {
    const downloads = downloadsStore.mapDownloads;
    let currentBytes = 0;
    let totalBytes = 0;
    for (const download of downloads) {
        currentBytes += download.currentBytes;
        totalBytes += download.totalBytes;
    }
    return currentBytes / totalBytes || 0;
});
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
    font-size: 1.2em;
    margin-bottom: 15px;
}
</style>
