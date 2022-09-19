<template>
    <div class="map-preview">
        <canvas ref="canvas" class="canvas" />
        <div class="overlay">
            <div class="toolbar">
                <Options
                    :modelValue="battle.battleOptions.startPosType"
                    :options="startPosOptions"
                    label="Start Pos"
                    optionLabel="label"
                    optionValue="value"
                    :unselectable="false"
                    @update:model-value="onStartPosChange"
                />
                <div v-if="battle.battleOptions.startPosType === StartPosType.Boxes" class="box-buttons">
                    <Button @click="setBoxes(defaultBoxes().EastVsWest)">
                        <img src="@/assets/images/icons/east-vs-west.png" />
                    </Button>
                    <Button @click="setBoxes(defaultBoxes().NorthVsSouth)">
                        <img src="@/assets/images/icons/north-vs-south.png" />
                    </Button>
                    <Button @click="setBoxes(defaultBoxes().NortheastVsSouthwest)">
                        <img src="@/assets/images/icons/northeast-vs-southwest.png" />
                    </Button>
                    <Button @click="setBoxes(defaultBoxes().NorthwestVsSouthEast)">
                        <img src="@/assets/images/icons/northwest-vs-southeast.png" />
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { entries, SignalBinding } from "jaz-ts-utils";
import { computed, onMounted, onUnmounted, Ref, ref, watch, WatchStopHandle } from "vue";

import defaultMinimapImage from "@/assets/images/default-minimap.png";
import Button from "@/components/inputs/Button.vue";
import Options from "@/components/inputs/Options.vue";
import { defaultBoxes } from "@/config/default-boxes";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { StartBox, StartPosType } from "@/model/battle/types";
import { CurrentUser } from "@/model/user";

type Transform = { x: number; y: number; width: number; height: number };

const props = defineProps<{
    battle: AbstractBattle;
    me: CurrentUser;
}>();

const canvas: Ref<HTMLCanvasElement | null> = ref(null);
let context: CanvasRenderingContext2D;
let textureMap: HTMLImageElement;
let mapTransform: Transform;
let loadingMap = false;

const mapData = computed(() => api.content.maps.installedMaps.find((map) => map.scriptName === props.battle.battleOptions.map));
const mapImages = computed(() =>
    mapData.value
        ? api.content.maps.getMapImages({ map: mapData.value })
        : {
              textureImagePath: defaultMinimapImage,
              heightImagePath: defaultMinimapImage,
              metalImagePath: defaultMinimapImage,
              typeImagePath: defaultMinimapImage,
          }
);

const startPosOptions: Array<{ label: string; value: StartPosType }> = [
    { label: "Fixed", value: StartPosType.Fixed },
    { label: "Boxes", value: StartPosType.Boxes },
];

let watchStopHandle: WatchStopHandle | undefined;
let mapCachedSignalBinding: SignalBinding | undefined;
let loadMapTimeoutId: number | undefined;

onMounted(async () => {
    if (!canvas.value) {
        return;
    }

    canvas.value.width = 478;
    canvas.value.height = 478;
    context = canvas.value.getContext("2d")!;
    context.imageSmoothingEnabled = false;

    loadMap();

    watchStopHandle = watch(
        [() => props.battle.battleOptions.map, () => props.battle.battleOptions.startPosType, () => props.battle.battleOptions.startBoxes, () => props.me.battleStatus],
        () => {
            loadMap();
        },
        { deep: true }
    );

    // TODO: this should only trigger when the download is of the currently selected map
    mapCachedSignalBinding = api.content.maps.onDownloadComplete.add((data) => {
        loadMap();
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

const setBoxes = (boxes: StartBox[]) => {
    props.battle.setStartBoxes(boxes);
};

const onStartPosChange = (startPosType: StartPosType) => {
    props.battle.setStartPosType(startPosType);
};

async function loadMap() {
    if (!canvas.value) {
        return;
    }

    // hack to fix a strange bug where calling this function more than once causes the map to load the wrong dimensions
    if (loadingMap) {
        loadMapTimeoutId = window.setTimeout(() => {
            loadMap();
        }, 100);
        return;
    } else {
        loadingMap = true;
        loadMapTimeoutId = window.setTimeout(() => {
            loadingMap = false;
        }, 100);
    }

    mapTransform = { x: 0, y: 0, width: canvas.value.width, height: canvas.value.height };

    const textureMap = await loadImage(mapImages.value.textureImagePath);

    const widthToHeightRatio = textureMap.width / textureMap.height;
    if (widthToHeightRatio > 1) {
        mapTransform.height = mapTransform.height / widthToHeightRatio;
    } else {
        mapTransform.width = mapTransform.width * widthToHeightRatio;
    }

    mapTransform.x = (canvas.value.width - mapTransform.width) / 2;
    mapTransform.y = (canvas.value.height - mapTransform.height) / 2;

    mapTransform = roundTransform(mapTransform);

    context.clearRect(0, 0, canvas.value.width, canvas.value.height);

    context.drawImage(textureMap, mapTransform.x, mapTransform.y, mapTransform.width, mapTransform.height);

    drawStartPosType();
}

function drawStartPosType() {
    if (props.battle.battleOptions.startPosType === StartPosType.Boxes) {
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
    entries(props.battle.battleOptions.startBoxes).forEach(([id, box], i) => {
        if (box) {
            if (props.me.battleStatus.isSpectator) {
                context.fillStyle = "rgba(255, 255, 255, 0.2)";
            } else if (props.me.battleStatus.teamId === i) {
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
    &:before {
        @extend .fullsize !optional;
        height: 52px;
        bottom: 0;
        left: 0;
        width: calc(100% - 20px);
        margin: 10px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        //backdrop-filter: saturate(60%);
        opacity: 0;
        transition: opacity 0.1s;
    }
    &:hover {
        &:before,
        .toolbar {
            opacity: 1;
        }
    }
}
.canvas {
    margin: 10px;
    aspect-ratio: 1;
}
.overlay {
    @extend .fullsize !optional;
    padding: 18px;
    left: 0;
    top: 0;
}
.toolbar {
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin-top: auto;
    opacity: 0;
    transition: opacity 0.1s;
}
.box-buttons {
    display: flex;
    flex-direction: row;
    gap: 2px;
    :deep(button) {
        min-height: unset;
        padding: 5px;
        &:hover {
            img {
                opacity: 1;
            }
        }
    }
    img {
        max-width: 23px;
        image-rendering: pixelated;
        opacity: 0.7;
    }
}
</style>
