<template>
    <div class="map-preview">
        <canvas ref="canvas" class="map-preview__canvas" />
        <div class="map-preview__actions">
            <div class="map-preview__start-pos-type">
                <Options v-model="startPosType" label="Start Pos" required>
                    <Option v-for="option in startPosOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </Option>
                </Options>
            </div>
            <div v-if="battle.battleOptions.startPosType === StartPosType.Boxes" class="map-preview__box-actions">
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
</template>

<script lang="ts" setup>
import { computed, onMounted, Ref, ref, watch } from "vue";

import defaultMinimapImage from "@/assets/images/default-minimap.png";
import Button from "@/components/inputs/Button.vue";
import Option from "@/components/inputs/Option.vue";
import Options from "@/components/inputs/Options.vue";
import { defaultBoxes } from "@/config/default-boxes";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { StartBox, StartPosType } from "@/model/battle/types";

type Transform = { x: number; y: number; width: number; height: number };

const props = defineProps<{
    battle: AbstractBattle;
}>();

const startPosType = ref(props.battle.battleOptions.startPosType);

const canvas: Ref<HTMLCanvasElement | null> = ref(null);
let context: CanvasRenderingContext2D;
let textureMap: HTMLImageElement;
let mapTransform: Transform;

const mapData = computed(() => api.content.maps.getMapByScriptName(props.battle.battleOptions.map));

const startPosOptions: Array<{ label: string; value: StartPosType }> = [
    { label: "Fixed", value: StartPosType.Fixed },
    { label: "Boxes", value: StartPosType.Boxes },
];

onMounted(async () => {
    if (!canvas.value) {
        return;
    }

    canvas.value.width = 478;
    canvas.value.height = 478;
    context = canvas.value.getContext("2d")!;
    context.imageSmoothingEnabled = false;

    loadMap();

    watch(
        [() => props.battle.battleOptions.map, () => props.battle.battleOptions.startPosType, () => props.battle.battleOptions.startBoxes, () => api.session.currentUser.battleStatus],
        () => {
            loadMap();
        },
        { deep: true }
    );

    api.content.maps.mapCache.on("item-cache-finish").add((data) => {
        loadMap();
    });
});

const setBoxes = (boxes: StartBox[]) => {
    //props.battle.battleOptions.startBoxes = clone(boxes);
};

async function loadMap() {
    if (!canvas.value) {
        return;
    }

    mapTransform = { x: 0, y: 0, width: canvas.value.width, height: canvas.value.height };

    if (!mapData.value || !mapData.value.textureImagePath) {
        textureMap = await loadImage(defaultMinimapImage, false);
    } else {
        textureMap = await loadImage(mapData.value.textureImagePath);
    }

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
    props.battle.battleOptions.startBoxes.forEach((box, teamId) => {
        if (api.session.currentUser.battleStatus.isSpectator) {
            context.fillStyle = "rgba(255, 255, 255, 0.2)";
        } else if (api.session.currentUser.battleStatus.teamId === teamId) {
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
        width: Math.floor(transform.width),
        height: Math.floor(transform.height),
    };
}
</script>

<style lang="scss" scoped>
.map-preview {
    display: flex;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    canvas {
        margin: 10px;
        aspect-ratio: 1;
    }
    &__actions {
        display: flex;
        position: absolute;
        width: 100%;
        left: 0;
        bottom: 0;
        padding: 15px;
        flex-direction: row;
        justify-content: space-between;
        opacity: 0;
        transition: opacity 0.1s;
    }
    &__box-actions {
        display: flex;
        flex-direction: row;
        gap: 2px;
        :deep(.btn) {
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
    &:hover {
        .map-preview__actions {
            opacity: 1;
        }
    }
}
</style>
