<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Map Details", hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="map-details-container">
            <Panel class="flex-grow">
                <div v-if="map" class="gap-md page">
                    <div class="gridform">
                        <div class="flex-right">
                            <Button v-tooltip.bottom="t('lobby.library.maps.back')" class="icon close flex-right" @click="returnToMaps">
                                <Icon :icon="arrow_back" :height="40" />
                            </Button>
                        </div>
                        <h1>{{ map.displayName }}</h1>
                    </div>
                    <div class="container">
                        <MapSimplePreview :map="map" />
                        <div class="flex-row flex-space-between">
                            <div class="flex-row gap-lg flex-center-items"></div>
                            <div class="flex-row flex-justify-end">
                                <div class="flex-row flex-center-items gap-sm"></div>
                            </div>
                        </div>
                        <div class="info flex-col fullheight">
                            <div class="details">
                                <h3>{{ t("lobby.library.maps.properties") }}</h3>
                                <div class="detail-text">
                                    {{ map.description }}
                                </div>
                                <div class="padding-lg"></div>
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
                                <div class="padding-lg"></div>
                                <div v-if="map.author" class="item-title">
                                    <p>
                                        {{ t("lobby.library.maps.author") }} <b class="padding-md item">{{ map.author }}</b>
                                    </p>
                                </div>
                            </div>
                            <!-- <div v-if="map.startPositions" class="detail-text"><b>Start Positions:</b> {{ map.startPositions.length }}</div> -->
                            <div class="gridform flex-bottom">
                                <Button
                                    @click="toggleMapFavorite"
                                    v-if="!map.isFavorite"
                                    class="icon"
                                    v-tooltip.bottom="t('lobby.library.maps.addToFavorites')"
                                >
                                    <Icon :icon="heart_plus" :height="33" />
                                </Button>
                                <Button
                                    @click="toggleMapFavorite"
                                    v-if="map.isFavorite"
                                    class="icon"
                                    v-tooltip.bottom="t('lobby.library.maps.removeFromFavorites')"
                                >
                                    <Icon :icon="heart_minus" :height="33" />
                                </Button>
                                <DownloadContentButton v-if="map" :map="map" class="fullwidth green" @click="play">{{
                                    t("lobby.buttons.quickPlay")
                                }}</DownloadContentButton>
                                <Button v-else class="fullwidth green" disabled>{{ t("lobby.buttons.quickPlay") }}</Button>
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
import { battleActions, battleStore } from "@renderer/store/battle.store";
import { useRouter } from "vue-router";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import Panel from "@renderer/components/common/Panel.vue";
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
import { useTypedI18n } from "@renderer/i18n";
import DownloadContentButton from "@renderer/components/controls/DownloadContentButton.vue";
import { watch } from "vue";

const { t } = useTypedI18n();

const router = useRouter();
const { id } = defineProps<{
    id: string;
}>();

const map = useDexieLiveQueryWithDeps([() => id], () => db.maps.get(id));

async function play() {
    battleActions.resetToDefaultBattle(enginesStore.selectedEngineVersion, gameStore.selectedGameVersion, map.value);
    battleStore.isSelectingGameMode = true;
}

function toggleMapFavorite() {
    db.maps.update(id, { isFavorite: !map.value?.isFavorite });
    if (map.value) map.value.isFavorite = !map.value.isFavorite;
}

function returnToMaps() {
    router.push("/library/maps/maps");
}

watch(
    () => battleStore.isSelectingGameMode,
    (newValue) => {
        battleStore.isLobbyOpened = !newValue;
    }
);
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

.item-title {
    color: #686868;
}
.item {
    color: #929292;
}
</style>
