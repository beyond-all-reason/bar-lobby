<template>
    <div class="map-container">
        <div v-if="battleStore.battleOptions.map" class="map" :style="aspectRatioDrivenStyle">
            <img loading="lazy" :src="mapTextureUrl" />
            <div v-if="battleStore.battleOptions.mapOptions.startPosType === StartPosType.Boxes && boxes" class="boxes">
                <div v-for="(box, i) in boxes" :key="`box${i}`" v-startBox="box" class="box highlight">
                    <div class="box-tooltip" @mousedown="e => handleBoxDragStart(i, e)">
                        <!-- Helper elements to modify the dimensions for the boxes -->

                        <!-- Sides -->
                        <div v-if="battleStore.battleOptions.mapOptions.customStartBoxes?.length > 0" 
                            class="box-tooltip-side n-side" 
                            data-side="north" 
                            @mousedown="e => handleResizeStart(i, 'north', null, e)" />
                        <div v-if="battleStore.battleOptions.mapOptions.customStartBoxes?.length > 0"
                            class="box-tooltip-side e-side"
                            data-side="east" 
                            @mousedown="e => handleResizeStart(i, 'east', null, e)" />
                        <div v-if="battleStore.battleOptions.mapOptions.customStartBoxes?.length > 0"
                            class="box-tooltip-side s-side"
                            data-side="south" 
                            @mousedown="e => handleResizeStart(i, 'south', null, e)" />
                        <div v-if="battleStore.battleOptions.mapOptions.customStartBoxes?.length > 0"
                            class="box-tooltip-side w-side"
                            data-side="west" 
                            @mousedown="e => handleResizeStart(i, 'west', null, e)" />
                        
                        <!-- Corners -->
                        <div v-if="battleStore.battleOptions.mapOptions.customStartBoxes?.length > 0"
                            class="box-tooltip-corner ne-corner"
                            data-corner="north-east" 
                            @mousedown="e => handleResizeStart(i, null, 'north-east', e)" />
                        <div v-if="battleStore.battleOptions.mapOptions.customStartBoxes?.length > 0"
                            class="box-tooltip-corner se-corner"
                            data-corner="south-east" 
                            @mousedown="e => handleResizeStart(i, null, 'south-east', e)" />
                        <div v-if="battleStore.battleOptions.mapOptions.customStartBoxes?.length > 0"
                            class="box-tooltip-corner sw-corner"
                            data-corner="south-west" 
                            @mousedown="e => handleResizeStart(i, null, 'south-west', e)" />
                        <div v-if="battleStore.battleOptions.mapOptions.customStartBoxes?.length > 0"
                            class="box-tooltip-corner nw-corner"
                            data-corner="north-west" 
                            @mousedown="e => handleResizeStart(i, null, 'north-west', e)" />

                        <span>{{ i + 1 }}</span>
                    </div>
                </div>
            </div>
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
    </div>
</template>

<script setup lang="ts">
import { StartPosType } from "@main/game/battle/battle-types";
import { useImageBlobUrlCache } from "@renderer/composables/useImageBlobUrlCache";
import vSetPlayerColor from "@renderer/directives/vSetPlayerColor";
import vStartBox from "@renderer/directives/vStartBox";
import vStartPos from "@renderer/directives/vStartPos";
import { battleStore } from "@renderer/store/battle.store";
import { spadsBoxToStartBox } from "@renderer/utils/start-boxes";
import { StartBox } from "tachyon-protocol/types";
import { computed, defineComponent, ref, watch } from "vue";

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
        return;
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
    },
    battleStore.battleOptions.mapOptions.customStartBoxes
);


const boxes = computed<StartBox[]>(() => {
    const startBoxIndex = battleStore.battleOptions.mapOptions.startBoxesIndex;
    const customStartBoxes = battleStore.battleOptions.mapOptions.customStartBoxes || [];

    if (startBoxIndex != undefined) {
        return startBoxes.value?.at(startBoxIndex)?.startboxes.map((box) => spadsBoxToStartBox(box.poly)) || [];   
    } else if (customStartBoxes.length > 0) {
        return customStartBoxes;
    }
    return [];
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

let isActiveResize = false;
let activeResizeBox: number | null = null;
let activeResizeSide: string | null = null;
let activeResizeCorner: string | null = null;
let startBoundingRect: DOMRect | null = null;

// Drag state for moving the box
let isActiveDrag = false;
let dragBoxIndex: number | null = null;
let dragStartMouse: { x: number; y: number } | null = null;
let dragStartBox: { top: number; left: number; bottom: number; right: number } | null = null;

function handleResizeStart(boxIndex: number, side: string | null, corner: string | null, event: MouseEvent) {
    event.preventDefault();
    isActiveResize = true;
    activeResizeBox = boxIndex;
    activeResizeSide = side;
    activeResizeCorner = corner;
    startBoundingRect = (event.target as HTMLElement).closest('.map')?.getBoundingClientRect() || null;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
}

function handleResizeMove(event: MouseEvent) {
    if (!isActiveResize || activeResizeBox == null || !startBoundingRect) return;
    const boundingRect = startBoundingRect;
    const mapWidth = boundingRect.width;
    const mapHeight = boundingRect.height;
    const trueEndPos = {
        x: event.clientX - boundingRect.x,
        y: event.clientY - boundingRect.y
    };
    const normX = Math.min(Math.max(trueEndPos.x / mapWidth, 0), 1);
    const normY = Math.min(Math.max(trueEndPos.y / mapHeight, 0), 1);
    const boxes = battleStore.battleOptions.mapOptions.customStartBoxes.slice();
    const box = { ...boxes[activeResizeBox] };
    if (activeResizeSide) {
        switch (activeResizeSide) {
            case "north": box.top = normY; break;
            case "south": box.bottom = normY; break;
            case "west": box.left = normX; break;
            case "east": box.right = normX; break;
        }
    } else if (activeResizeCorner) {
        switch (activeResizeCorner) {
            case "north-west": box.top = normY; box.left = normX; break;
            case "north-east": box.top = normY; box.right = normX; break;
            case "south-west": box.bottom = normY; box.left = normX; break;
            case "south-east": box.bottom = normY; box.right = normX; break;
        }
    }
    box.top = Math.min(Math.max(box.top, 0), 1);
    box.right = Math.min(Math.max(box.right, 0), 1);
    box.bottom = Math.min(Math.max(box.bottom, 0), 1);
    box.left = Math.min(Math.max(box.left, 0), 1);
    boxes[activeResizeBox] = box;
    battleStore.battleOptions.mapOptions.customStartBoxes = boxes;
}

function handleResizeEnd() {
    isActiveResize = false;
    activeResizeBox = null;
    activeResizeSide = null;
    activeResizeCorner = null;
    startBoundingRect = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
}

// --- Drag to move box ---
function handleBoxDragStart(boxIndex: number, event: MouseEvent) {
    // Only start drag if not clicking on a side/corner
    if ((event.target as HTMLElement).classList.contains('box-tooltip-side') || (event.target as HTMLElement).classList.contains('box-tooltip-corner')) {
        return;
    }
    event.preventDefault();
    isActiveDrag = true;
    dragBoxIndex = boxIndex;
    startBoundingRect = (event.target as HTMLElement).closest('.map')?.getBoundingClientRect() || null;
    dragStartMouse = { x: event.clientX, y: event.clientY };
    const box = battleStore.battleOptions.mapOptions.customStartBoxes[boxIndex];
    dragStartBox = { top: box.top, left: box.left, bottom: box.bottom, right: box.right };
    document.addEventListener('mousemove', handleBoxDragMove);
    document.addEventListener('mouseup', handleBoxDragEnd);
}

function handleBoxDragMove(event: MouseEvent) {
    if (!isActiveDrag || dragBoxIndex == null || !startBoundingRect || !dragStartMouse || !dragStartBox) return;
    const boundingRect = startBoundingRect;
    const mapWidth = boundingRect.width;
    const mapHeight = boundingRect.height;
    const dx = (event.clientX - dragStartMouse.x) / mapWidth;
    const dy = (event.clientY - dragStartMouse.y) / mapHeight;
    let { top, left, bottom, right } = dragStartBox;
    // Calculate box size
    const height = bottom - top;
    const width = right - left;
    // Move box
    let newTop = top + dy;
    let newLeft = left + dx;
    let newBottom = newTop + height;
    let newRight = newLeft + width;
    // Clamp to [0,1]
    if (newTop < 0) {
        newBottom += -newTop;
        newTop = 0;
    }
    if (newLeft < 0) {
        newRight += -newLeft;
        newLeft = 0;
    }
    if (newBottom > 1) {
        newTop -= (newBottom - 1);
        newBottom = 1;
    }
    if (newRight > 1) {
        newLeft -= (newRight - 1);
        newRight = 1;
    }
    // Update box
    const boxes = battleStore.battleOptions.mapOptions.customStartBoxes.slice();
    boxes[dragBoxIndex] = { ...boxes[dragBoxIndex], top: newTop, left: newLeft, bottom: newBottom, right: newRight };
    battleStore.battleOptions.mapOptions.customStartBoxes = boxes;
}

function handleBoxDragEnd() {
    isActiveDrag = false;
    dragBoxIndex = null;
    dragStartMouse = null;
    dragStartBox = null;
    startBoundingRect = null;
    document.removeEventListener('mousemove', handleBoxDragMove);
    document.removeEventListener('mouseup', handleBoxDragEnd);
}
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
    position: relative;
}

.box-tooltip-side,
.box-tooltip-corner {
    // background-color: red;
    position: absolute;
}

.box-tooltip-side:hover,
.box-tooltip-corner:hover {
    box-shadow:
        0 0 8px rgba(200, 200, 200, 0.4),
        0 0 15px rgba(200, 200, 200, 0.3);
    background-color: rgba(200, 200, 200, 0.3);
    cursor: url("/src/renderer/assets/images/cursor_pointer.png"), pointer !important;
}

.box-tooltip-side:active,
.box-tooltip-corner:active {
    box-shadow:
        0 0 8px rgba(200, 200, 200, 0.6),
        0 0 15px rgba(200, 200, 200, 0.5);
    background-color: rgba(200, 200, 200, 0.6);
}

$centerOffset: -5px;
$sideWidth: 10px;
$sideLength: calc(100% - $sideWidth);

.box-tooltip-side.n-side {
    width: $sideLength;
    height: $sideWidth;
    top: $centerOffset;
}

.box-tooltip-side.e-side {
    width: $sideWidth;
    height: $sideLength;
    right: $centerOffset;
}

.box-tooltip-side.s-side {
    width: $sideLength;
    height: $sideWidth;
    bottom: $centerOffset;
}

.box-tooltip-side.w-side {
    width: $sideWidth;
    height: $sideLength;
    left: $centerOffset;
}

.box-tooltip-corner.ne-corner {
    width: $sideWidth;
    height: $sideWidth;
    top: $centerOffset;
    right: $centerOffset
}

.box-tooltip-corner.se-corner {
    width: $sideWidth;
    height: $sideWidth;
    bottom: $centerOffset;
    right: $centerOffset
}

.box-tooltip-corner.nw-corner {
    width: $sideWidth;
    height: $sideWidth;
    top: $centerOffset;
    left: $centerOffset
}

.box-tooltip-corner.sw-corner {
    width: $sideWidth;
    height: $sideWidth;
    bottom: $centerOffset;
    left: $centerOffset
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
