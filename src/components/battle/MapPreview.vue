<template>
    <div ref="mapPreviewEl" class="map-preview">
        <canvas ref="canvas" class="canvas" />
    </div>
</template>

<script lang="ts" setup>
import { entries, SignalBinding } from "jaz-ts-utils";
import { computed, onMounted, onUnmounted, Ref, ref, watch, WatchStopHandle } from "vue";

import defaultMinimapImage from "@/assets/images/default-minimap.png";
import { StartBox, StartPosType } from "@/model/battle/types";

type Transform = { x: number; y: number; width: number; height: number };

const props = defineProps<{
    map: string;
    startPosType: StartPosType;
    startBoxes: Record<number, StartBox | undefined>;
    myTeamId: number;
    isSpectator: boolean;
}>();

const mapPreviewEl: Ref<HTMLDivElement | null> = ref(null);
const canvas: Ref<HTMLCanvasElement | null> = ref(null);
let context: CanvasRenderingContext2D;
let mapTransform: Transform;
let loadingMap = false;

const mapData = computed(() => api.content.maps.installedMaps.find((map) => map.scriptName === props.map));
const mapImages = computed(() => {
    if (mapData.value) {
        return api.content.maps.getMapImages({ map: mapData.value });
    }
    return {
        textureImagePath: defaultMinimapImage,
        heightImagePath: defaultMinimapImage,
        metalImagePath: defaultMinimapImage,
        typeImagePath: defaultMinimapImage,
    };
});

let watchStopHandle: WatchStopHandle | undefined;
let mapCachedSignalBinding: SignalBinding | undefined;
let loadMapTimeoutId: number | undefined;

onMounted(async () => {
    if (!canvas.value || !mapPreviewEl.value) {
        return;
    }

    const canvasWidth = await onCanvasResize();

    canvas.value.width = canvasWidth;
    canvas.value.height = canvasWidth;

    context = canvas.value.getContext("2d")!;
    context.imageSmoothingEnabled = false;

    loadMap(canvasWidth);

    watchStopHandle = watch(
        [() => props.map, () => props.startPosType, () => props.startBoxes, () => props.myTeamId],
        () => {
            loadMap(canvasWidth);
        },
        { deep: true }
    );

    // TODO: this should only trigger when the download is of the currently selected map
    mapCachedSignalBinding = api.content.maps.onDownloadComplete.add((data) => {
        loadMap(canvasWidth);
    });
});

onUnmounted(() => {
    if (watchStopHandle) {
        watchStopHandle();
        watchStopHandle = undefined;
    }
    if (mapCachedSignalBinding) {
        mapCachedSignalBinding.destroy();
        mapCachedSignalBinding = undefined;
    }
    if (loadMapTimeoutId) {
        window.clearTimeout(loadMapTimeoutId);
    }
});

function onCanvasResize() {
    return new Promise<number>((resolve) => {
        const resizeObserver = new ResizeObserver((thing) => {
            resolve(thing[0].contentRect.width);
        });
        resizeObserver.observe(canvas.value!);
    });
}

async function loadMap(canvasWidth: number) {
    if (!canvas.value) {
        return;
    }

    // hack to fix a strange bug where calling this function more than once causes the map to load the wrong dimensions
    if (loadingMap) {
        loadMapTimeoutId = window.setTimeout(() => {
            loadMap(canvasWidth);
        }, 100);
        return;
    } else {
        loadingMap = true;
        loadMapTimeoutId = window.setTimeout(() => {
            loadingMap = false;
        }, 100);
    }

    mapTransform = { x: 0, y: 0, width: canvasWidth, height: canvasWidth };

    const textureMap = await loadImage(mapImages.value.textureImagePath, Boolean(mapData.value));

    const widthToHeightRatio = textureMap.width / textureMap.height;
    if (widthToHeightRatio > 1) {
        mapTransform.height = mapTransform.height / widthToHeightRatio;
    } else {
        mapTransform.width = mapTransform.width * widthToHeightRatio;
    }

    mapTransform.x = (canvasWidth - mapTransform.width) / 2;
    mapTransform.y = (canvasWidth - mapTransform.height) / 2;

    mapTransform = roundTransform(mapTransform);

    context.clearRect(0, 0, canvasWidth, canvasWidth);

    context.drawImage(textureMap, mapTransform.x, mapTransform.y, mapTransform.width, mapTransform.height);

    drawStartPosType();
}

function drawStartPosType() {
    if (props.startPosType === StartPosType.Boxes) {
        drawBoxes();
    } else {
        drawFixedPositions();
    }
}

function drawFixedPositions() {
    if (mapData.value?.startPositions) {
        for (const startPos of mapData.value.startPositions) {
            const xPos = mapTransform.x + mapTransform.width * (startPos.x / (mapData.value.width * 512));
            const yPos = mapTransform.y + mapTransform.height * (startPos.z / (mapData.value.height * 512));

            context.fillStyle = "rgba(255, 255, 255, 0.6)";
            context.beginPath();
            context.arc(xPos, yPos, 5, 0, 2 * Math.PI);
            context.fill();
            context.closePath();
        }
    }
}

function drawBoxes() {
    entries(props.startBoxes).forEach(([id, box], i) => {
        if (box) {
            if (props.isSpectator) {
                context.fillStyle = "rgba(255, 255, 255, 0.2)";
            } else if (props.myTeamId === i) {
                context.fillStyle = "rgba(0, 255, 0, 0.2)";
            } else {
                context.fillStyle = "rgba(255, 0, 0, 0.2)";
            }

            context.strokeStyle = "rgba(255, 255, 255, 0.5)";
            context.lineWidth = 1;

            let boxTransform: Transform = {
                x: mapTransform.x + mapTransform.width * box.xPercent,
                y: mapTransform.y + mapTransform.height * box.yPercent,
                width: mapTransform.width * box.widthPercent,
                height: mapTransform.height * box.heightPercent,
            };
            boxTransform = roundTransform(boxTransform);
            context.fillRect(boxTransform.x, boxTransform.y, boxTransform.width, boxTransform.height);
        }
    });
}

function loadImage(url: string, isStatic = true) {
    return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = `${isStatic ? "file://" : ""}${url}`;
    });
}

function roundTransform(transform: Transform) {
    return {
        x: Math.floor(transform.x),
        y: Math.floor(transform.y),
        width: Math.ceil(transform.width),
        height: Math.ceil(transform.height),
    };
}
</script>

<style lang="scss" scoped>
.map-preview {
    display: flex;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
}
.canvas {
    margin: 10px;
    aspect-ratio: 1;
    width: 100%;
}
</style>
