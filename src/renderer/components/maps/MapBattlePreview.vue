<template>
    <div class="map-container">
        <div v-if="map" class="map" :style="aspectRatioDrivenStyle">
            <img loading="lazy" :src="mapTextureUrl" />
            <div v-if="battleStore.battleOptions.mapOptions.startPosType === StartPosType.Boxes && boxes" class="boxes">
                <div v-for="(box, i) in boxes" :key="`box${i}`" v-startBox="box" class="box highlight">
                    <div class="box-tooltip">
                        <span>{{ i + 1 }}</span>
                    </div>
                </div>
            </div>
            <div v-if="battleStore.battleOptions.mapOptions.startPosType === StartPosType.Fixed" class="start-positions">
                <div
                    v-for="(side, sideIndex) in map.startPos?.team[battleStore.battleOptions.mapOptions.fixedPositionsIndex]?.sides"
                    :key="`side${sideIndex}`"
                >
                    <div
                        v-for="(spawnPoint, spIndex) in side.starts"
                        :key="`startPos${spIndex}`"
                        v-startPos="[map.startPos.positions[spawnPoint.spawnPoint], mapWidthElmos, mapHeightElmos]"
                        v-setPlayerColor="rgbColors[sideIndex]"
                        class="start-pos"
                    >
                        <div class="start-pos-tooltip">
                            <span>{{ spawnPoint.spawnPoint }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { StartPosType } from "@main/game/battle/battle-types";
import { useImageBlobUrlCache } from "@renderer/composables/useImageBlobUrlCache";
import vSetPlayerColor from "@renderer/directives/vSetPlayerColor";
import vStartBox from "@renderer/directives/vStartBox";
import vStartPos from "@renderer/directives/vStartPos";
import { battleStore } from "@renderer/store/battle.store";
import { fetchMapImages } from "@renderer/store/maps.store";
import { computed, defineComponent, ref, watch, watchEffect } from "vue";

defineComponent({
    directives: {
        startBox: vStartBox,
        startPos: vStartPos,
        setPlayerColor: vSetPlayerColor,
    },
});

const map = ref(battleStore.battleOptions.map);
const { get } = useImageBlobUrlCache();
const mapTextureUrl = computed(() => {
    if (!map.value?.images) {
        return;
    }
    return get(map.value?.springName, map.value?.imagesBlob?.preview);
});

watchEffect(() => {
    if (!map.value?.springName) {
        return;
    }
    if (!map.value?.imagesBlob?.preview) {
        fetchMapImages(map.value);
    }
});

const startBoxes = ref(map.value?.startboxesSet);
const startPositions = ref(map.value?.startPos);
const mapWidthElmos = ref(map.value?.mapWidth ? map.value.mapWidth * 512 : null);
const mapHeightElmos = ref(map.value?.mapHeight ? map.value.mapHeight * 512 : null);
watch(
    () => battleStore.battleOptions.map,
    () => {
        map.value = battleStore.battleOptions.map;
        startBoxes.value = map.value?.startboxesSet;
        startPositions.value = map.value?.startPos;
        mapWidthElmos.value = map.value?.mapWidth ? map.value.mapWidth * 512 : null;
        mapHeightElmos.value = map.value?.mapHeight ? map.value.mapHeight * 512 : null;
    }
);

const boxes = computed(() => {
    return startBoxes.value.at(battleStore.battleOptions.mapOptions.startBoxesIndex)?.startboxes.map((box) => {
        const { x: x1, y: y1 } = box.poly.at(0);
        const { x: x2, y: y2 } = box.poly.at(1);
        return {
            top: y1 / 200,
            bottom: y2 / 200,
            left: x1 / 200,
            right: x2 / 200,
        };
    });
});

const aspectRatioDrivenStyle = computed(() => {
    if (!map.value?.mapWidth || !map.value?.mapHeight) {
        return;
    }
    return map.value.mapWidth / map.value.mapHeight > 1 ? "height: auto;" : "height: 100%;";
});

const rgbColors = [
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 0, b: 255 },
    { r: 0, g: 255, b: 0 },
    { r: 255, g: 255, b: 0 },
    { r: 255, g: 0, b: 255 },
    { r: 0, g: 255, b: 255 },
];
</script>

<style lang="scss" scoped>
.map-container {
    flex-shrink: 0;
    aspect-ratio: 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background-color: rgba(0, 0, 0, 0.3);
}

.map {
    position: relative;
    object-fit: contain;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    img {
        max-height: 100%;
        width: 100%;
    }
}

.boxes {
    position: absolute;
    width: 100%;
    height: 100%;
}

.box {
    position: absolute;
    box-sizing: border-box;
    // &:nth-child(1) {
    //     background: rgba(23, 202, 32, 0.3);
    // }
}

.box-tooltip {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-size: 1.5rem;
}

@keyframes subtleGlow {
    0%,
    100% {
        box-shadow:
            0 0 8px rgba(200, 200, 200, 0.4),
            0 0 15px rgba(200, 200, 200, 0.3);
        background-color: rgba(200, 200, 200, 0.1);
    }
    50% {
        box-shadow:
            0 0 15px rgba(200, 200, 200, 0.5),
            0 0 25px rgba(200, 200, 200, 0.4);
        background-color: rgba(200, 200, 200, 0.15);
    }
}

.highlight {
    border: 2px dashed rgba(255, 255, 255, 1);
    box-shadow:
        0 0 15px rgba(200, 200, 200, 0.5),
        0 0 25px rgba(200, 200, 200, 0.4);
    background-color: rgba(200, 200, 200, 0.15);
    //animation: subtleGlow 1.5s infinite ease-in-out; // super resource intensive unfortunately
    transition: all 0.2s ease;
    will-change: width, height, top, left;
}

.start-positions {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 0;
}

.start-pos {
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 14px;
    border: 1px solid hsl(0deg 0% 0% / 53%);
    box-shadow: 1px 1px rgb(0 0 0 / 43%);
    transform: translateX(-6px) translateY(-6px);
    &-tooltip {
        display: flex;
        align-items: center;
        position: absolute;
        transform: translateX(-50%);
        left: 6px;
        bottom: 13px;
        font-size: 12px;
        width: max-content;
        color: white;
        box-shadow:
            0 0 15px rgba(200, 200, 200, 0.5),
            0 0 25px rgba(200, 200, 200, 0.4);
        background-color: rgba(200, 200, 200, 0.15);
        .left &,
        .right & {
            bottom: -2px;
            transform: none;
        }
        .left & {
            left: 16px;
        }
        .right & {
            right: 16px;
            left: initial;
        }
        img {
            height: 16px;
            width: 16px;
        }
    }
}
</style>
