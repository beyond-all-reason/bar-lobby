<template>
    <div id="map-canvas-container" class="map-preview">
        <canvas id="map-canvas" class="map-preview__canvas" />
        <div class="map-preview__actions">
            <div class="map-preview__start-pos-type">
                <Options v-model="battle.battleOptions.startPosType" label="Start Pos" required>
                    <Option v-for="option in startPosOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </Option>
                </Options>
            </div>
            <div v-if="battle.battleOptions.startPosType === StartPosType.Boxes" class="map-preview__box-actions">
                <Button @click="setBoxes(defaultBoxes.EastVsWest)">
                    <img src="@/assets/images/icons/east-vs-west.png">
                </Button>
                <Button @click="setBoxes(defaultBoxes.NorthVsSouth)">
                    <img src="@/assets/images/icons/north-vs-south.png">
                </Button>
                <Button @click="setBoxes(defaultBoxes.NortheastVsSouthwest)">
                    <img src="@/assets/images/icons/northeast-vs-southwest.png">
                </Button>
                <Button @click="setBoxes(defaultBoxes.NorthwestVsSouthEast)">
                    <img src="@/assets/images/icons/northwest-vs-southeast.png">
                </Button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, watch } from "vue";
import { StartBox, StartPosType } from "@/model/battle/types";
import { MapData } from "@/model/map-data";
import Button from "@/components/inputs/Button.vue";
import { defaultBoxes } from "@/config/default-boxes";
import Options from "@/components/inputs/Options.vue";
import Option from "@/components/inputs/Option.vue";

const battle = api.session.currentBattle;

type Transform = { x: number, y: number, width: number, height: number };

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
let textureMap: HTMLImageElement;
let mapTransform: Transform;
let mapData: MapData | undefined | null;

const startPosOptions: Array<{ label: string, value: StartPosType }> = [
    { label: "Fixed", value: StartPosType.Fixed },
    { label: "Boxes", value: StartPosType.Boxes }
];

onMounted(async () => {
    canvas = document.getElementById("map-canvas") as HTMLCanvasElement;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.width;
    context = canvas.getContext("2d")!;
    context.imageSmoothingEnabled = false;

    loadMap();

    watch([() => battle.battleOptions.mapFileName, () => battle.battleOptions.startPosType, () => battle.me], () => {
        loadMap();
    }, { deep: true });
});

const setBoxes = (boxes: StartBox[]) => {
    battle.battleOptions.startBoxes = boxes;
};

async function loadMap() {
    if (mapData?.fileNameWithExt !== battle.battleOptions.mapFileName) {
        mapData = api.content.maps.getMapByFileName(battle.battleOptions.mapFileName);
        if (!mapData || !mapData.textureImagePath) {
            // TODO: missing map image
            return;
        }

        textureMap = await loadImage(mapData.textureImagePath);
    }

    mapTransform = { x: 0, y: 0, width: canvas.width, height: canvas.height };

    const widthToHeightRatio = textureMap.width / textureMap.height;
    if (widthToHeightRatio > 1) {
        mapTransform.height = mapTransform.height / widthToHeightRatio;
    } else {
        mapTransform.width = mapTransform.width * widthToHeightRatio;
    }

    mapTransform.x = (canvas.width - mapTransform.width) / 2;
    mapTransform.y = (canvas.height - mapTransform.height) / 2;

    mapTransform = roundTransform(mapTransform);

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.drawImage(textureMap, mapTransform.x, mapTransform.y, mapTransform.width, mapTransform.height);

    drawStartPosType(battle.battleOptions.startPosType);
}

function drawStartPosType(startPosType: StartPosType) {
    if (startPosType === StartPosType.Fixed) {
        drawFixedPositions();
    } else if (startPosType === StartPosType.Boxes) {
        drawBoxes();
    }
}

function drawFixedPositions() {
    if (mapData?.startPositions) {
        for (const startPos of mapData.startPositions) {
            const xPos = mapTransform.x + mapTransform.width * (startPos.x / (mapData.width * 512));
            const yPos = mapTransform.y + mapTransform.height * (startPos.z / (mapData.height * 512));

            context.fillStyle = "rgba(255, 255, 255, 0.6)";
            context.beginPath();
            context.arc(xPos, yPos, 5, 0, 2 * Math.PI);
            context.fill();
            context.closePath();
        }
    }
}

function drawBoxes() {
    battle.battleOptions.startBoxes.forEach((box, teamId) => {
        if (battle.me.value.type === "spectator") {
            context.fillStyle = "rgba(255, 255, 255, 0.2)";
        } else if (battle.me.value.teamId === teamId) {
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
            height: mapTransform.height * box.heightPercent
        };
        boxTransform = roundTransform(boxTransform);
        context.fillRect(boxTransform.x, boxTransform.y, boxTransform.width, boxTransform.height);
    });
}

function loadImage(url: string) {
    return new Promise<HTMLImageElement>(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = `file://${url}`;
    });
}

function roundTransform(transform: Transform) {
    return {
        x: Math.floor(transform.x),
        y: Math.floor(transform.y),
        width: Math.floor(transform.width),
        height: Math.floor(transform.height)
    };
}
</script>