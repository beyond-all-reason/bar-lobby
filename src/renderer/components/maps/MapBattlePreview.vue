<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="map-container">
        <div v-if="battleStore.battleOptions.map" class="map" :style="aspectRatioDrivenStyle">
            <img loading="lazy" :src="mapTextureUrl" />
            <!--
            When the active preset has polygon-shaped startboxes (3+ vertex
            ring), render a read-only SVG overlay only — the rect-div drag
            handles are suppressed. The user "breaks free" into custom rect
            edit mode by picking a different preset in the map options modal.
            This matches the BYAR-Chobby#1184 behaviour reviewers approved.
            For pure-rectangle presets (or custom mode), the existing rect
            divs render with full drag/resize affordance unchanged.
            -->
            <div
                v-if="battleStore.battleOptions.mapOptions.startPosType === StartPosType.Boxes && boxes && !polygonPresetActive"
                class="boxes"
            >
                <MapBattlePreviewStartBox v-for="(box, i) in boxes" v-startBox="box" :key="`box${i}`" :id="i" :box="box" />
            </div>
            <svg
                v-if="
                    battleStore.battleOptions.mapOptions.startPosType === StartPosType.Boxes &&
                    polygonPresetActive &&
                    polygonOverlays.length > 0
                "
                class="polygon-overlay"
                viewBox="0 0 200 200"
                preserveAspectRatio="none"
            >
                <path
                    v-for="shape in polygonOverlays"
                    :key="`poly${shape.index}`"
                    :d="shape.path"
                    fill="rgba(255, 255, 255, 0.08)"
                    stroke="rgba(255, 255, 255, 0.9)"
                    stroke-dasharray="6, 6"
                    stroke-width="1.5"
                    vector-effect="non-scaling-stroke"
                />
            </svg>
            <div
                v-if="battleStore.battleOptions.mapOptions.startPosType in [StartPosType.Fixed, StartPosType.Random]"
                class="start-positions"
            >
                <div
                    v-for="(side, sideIndex) in battleStore.battleOptions.map.startPos?.team?.[
                        battleStore.battleOptions.mapOptions.fixedPositionsIndex ?? 0
                    ]?.sides"
                    :key="`side${sideIndex}`"
                >
                    <div
                        v-for="(spawnPoint, spIndex) in side.starts"
                        :key="`startPos${spIndex}`"
                        v-startPos="[
                            battleStore.battleOptions.map.startPos?.positions[spawnPoint.spawnPoint],
                            mapWidthElmos,
                            mapHeightElmos,
                        ]"
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
        <div v-else class="background">
            <div class="background" :style="`background-image: url('${mapTextureUrl}')`"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { StartPosType } from "@main/game/battle/battle-types";
import { useImageBlobUrlCache } from "@renderer/composables/useImageBlobUrlCache";
import vSetPlayerColor from "@renderer/directives/vSetPlayerColor";
import vStartBox from "@renderer/directives/vStartBox";
import vStartPos from "@renderer/directives/vStartPos";
import { battleActions, battleStore } from "@renderer/store/battle.store";
import { StartBox } from "tachyon-protocol/types";
import { computed, defineComponent, ref, watch } from "vue";
import MapBattlePreviewStartBox from "@renderer/components/maps/MapBattlePreviewStartBox.vue";
import defaultMiniMap from "/src/renderer/assets/images/default-minimap.png?url";
import { isPolygonShape, tessellateRing } from "@renderer/utils/spline-tessellation";

defineComponent({
    directives: {
        startBox: vStartBox,
        startPos: vStartPos,
        setPlayerColor: vSetPlayerColor,
    },
});

const { get } = useImageBlobUrlCache();
const mapTextureUrl = computed(() => {
    if (!battleStore.battleOptions.map?.images) {
        return defaultMiniMap;
    }
    return get(battleStore.battleOptions.map?.springName, battleStore.battleOptions.map?.imagesBlob?.preview);
});

const startBoxes = ref(battleStore.battleOptions.map?.startboxesSet);
const startPositions = ref(battleStore.battleOptions.map?.startPos);
const mapWidthElmos = ref(battleStore.battleOptions.map?.mapWidth ? battleStore.battleOptions.map.mapWidth * 512 : null);
const mapHeightElmos = ref(battleStore.battleOptions.map?.mapHeight ? battleStore.battleOptions.map.mapHeight * 512 : null);
watch(
    () => battleStore.battleOptions.map,
    () => {
        startBoxes.value = battleStore.battleOptions.map?.startboxesSet;
        startPositions.value = battleStore.battleOptions.map?.startPos;
        mapWidthElmos.value = battleStore.battleOptions.map?.mapWidth ? battleStore.battleOptions.map.mapWidth * 512 : null;
        mapHeightElmos.value = battleStore.battleOptions.map?.mapHeight ? battleStore.battleOptions.map.mapHeight * 512 : null;
    }
);

const boxes = computed<StartBox[]>(() => battleActions.getCurrentStartBoxes());

// Active preset is "polygon mode" when the currently-selected map preset
// (startBoxesIndex) contains at least one 3+ vertex ring. In that mode, the
// rect divs are hidden and only the SVG overlay renders — no drag/resize
// affordance, since the polygon shape is intrinsic to the map and not
// user-editable from the lobby. Switching to a custom preset clears
// startBoxesIndex and turns this off.
const polygonPresetActive = computed<boolean>(() => {
    const startBoxesIndex = battleStore.battleOptions.mapOptions.startBoxesIndex;
    if (startBoxesIndex === undefined) return false;
    const set = battleStore.battleOptions.map?.startboxesSet?.[startBoxesIndex];
    if (!set) return false;
    return set.startboxes.some((box) => isPolygonShape(box.poly));
});

// SVG `<path>` strings for the active polygon preset's startboxes. Reads
// directly from startboxesSet (rather than the rect-flattened `boxes`
// computed above) so the polygon vertex data — including any per-anchor
// Catmull-Rom strength — is preserved through the render. The path uses
// the [0, 200] coordinate space directly via the parent SVG's viewBox.
const polygonOverlays = computed<{ index: number; path: string }[]>(() => {
    const startBoxesIndex = battleStore.battleOptions.mapOptions.startBoxesIndex;
    if (startBoxesIndex === undefined) return [];
    const set = battleStore.battleOptions.map?.startboxesSet?.[startBoxesIndex];
    if (!set) return [];
    const out: { index: number; path: string }[] = [];
    set.startboxes.forEach((box, index) => {
        if (!isPolygonShape(box.poly)) return;
        const tess = tessellateRing(box.poly);
        if (tess.length === 0) return;
        const path = `M ${tess.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
        out.push({ index, path });
    });
    return out;
});

const aspectRatioDrivenStyle = computed(() => {
    if (!battleStore.battleOptions.map?.mapWidth || !battleStore.battleOptions.map?.mapHeight) {
        return;
    }
    return battleStore.battleOptions.map.mapWidth / battleStore.battleOptions.map.mapHeight > 1 ? "height: auto;" : "height: 100%;";
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
.background {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
}

.boxes {
    position: absolute;
    width: 100%;
    height: 100%;
}

.polygon-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
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
