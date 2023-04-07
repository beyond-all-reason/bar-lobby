<template>
    <div ref="canvasContainerEl" class="canvas-container"></div>
</template>

<script lang="ts" setup>
import { rgb2hex } from "@pixi/utils";
import { useElementSize } from "@vueuse/core";
import { Application, Graphics, Sprite } from "pixi.js";
import { onMounted, onUnmounted, ref, watch } from "vue";

import { StartBox, StartPosType } from "@/model/battle/battle-types";
import { MapData } from "@/model/map-data";
import { CurrentUser } from "@/model/user";
import { mipmapSize } from "@/workers/parse-map";

const props = defineProps<{
    map?: MapData;
    currentUser?: CurrentUser;
    startPosType?: StartPosType;
    startBoxes?: Record<number, StartBox | undefined>;
    startPositions?: Array<
        | {
              position: { x: number; z: number };
              rgbColor?: { r: number; g: number; b: number };
          }
        | undefined
    >;
}>();

const app = ref<Application>();
const canvasContainerEl = ref<HTMLElement>();
const parentSize = useElementSize(canvasContainerEl);

onMounted(setup);
onUnmounted(() => {
    // make sure pixi app is properly destroyed after out transition has finished
    setTimeout(() => {
        app.value?.destroy(true);
    }, 150);
});

watch([parentSize.width, parentSize.height], ([width, height], [oldWidth, oldHeight]) => {
    if (app.value && width && height) {
        const smallestDimension = Math.min(width, height);
        app.value.renderer.resize(smallestDimension, smallestDimension);
        app.value.render();
        onResize();
    }
});

watch(() => props.map, setMapImage);
watch(() => props.startBoxes, drawBoxes);
watch(() => props.startPositions, drawStartPositions);
watch(
    () => props.currentUser?.battleStatus.teamId,
    () => {
        drawBoxes();
        drawStartPositions();
    }
);
watch(() => props.currentUser?.battleStatus.isSpectator, drawBoxes);
watch(
    () => props.startPosType,
    () => {
        drawBoxes();
        drawStartPositions();
    }
);

let mapSprite: Sprite | undefined;
let boxesGfx: Graphics | undefined;
let startPositionsGfx: Graphics | undefined;

function setup() {
    app.value = new Application({
        background: "#000",
        backgroundAlpha: 0.3,
        antialias: true,
    });
    if (app.value.view && app.value.view instanceof HTMLCanvasElement) {
        canvasContainerEl.value?.appendChild(app.value.view);
    }

    boxesGfx = new Graphics();
    app.value.stage.addChild(boxesGfx);

    startPositionsGfx = new Graphics();
    app.value.stage.addChild(startPositionsGfx);

    setMapImage();
}

function onResize() {
    // this is often 0 in modals, don't want to waste render time
    if (parentSize.width.value > 0 && parentSize.height.value > 0) {
        resizeMapImage();
        drawBoxes();
        drawStartPositions();
    }
}

async function setMapImage() {
    if (!app.value || !props.map) {
        return;
    }

    if (mapSprite) {
        app.value.stage.removeChild(mapSprite);
    }

    const textureImage = api.content.maps.getMapImages(props.map).textureImagePath;
    mapSprite = Sprite.from(textureImage, {
        width: props.map.width * mipmapSize * 16,
        height: props.map.height * mipmapSize * 16,
    });
    app.value.stage.addChildAt(mapSprite, 0);

    onResize();
}

function resizeMapImage() {
    if (!app.value || !mapSprite) {
        return;
    }

    if (mapSprite.width > mapSprite.height) {
        mapSprite.width = app.value.view.width;
        mapSprite.scale.y = mapSprite.scale.x;
    } else {
        mapSprite.height = app.value.view.height;
        mapSprite.scale.x = mapSprite.scale.y;
    }
    mapSprite.x = app.value.view.width * 0.5 - mapSprite.width * 0.5;
    mapSprite.y = app.value.view.height * 0.5 - mapSprite.height * 0.5;
}

function drawBoxes() {
    if (!app.value || !boxesGfx || !mapSprite) {
        return;
    }

    if (props.startPosType !== StartPosType.Boxes) {
        boxesGfx.visible = false;
        return;
    } else {
        boxesGfx.visible = true;
        boxesGfx.alpha = 0.2;
        boxesGfx.clear();
    }

    const isSpectator = props.currentUser?.battleStatus.isSpectator;
    const myTeamId = props.currentUser?.battleStatus.teamId;

    for (const teamIdStr in props.startBoxes) {
        const box = props.startBoxes[teamIdStr];
        if (!box) {
            continue;
        }

        const teamId = parseInt(teamIdStr);
        if (isSpectator) {
            boxesGfx?.beginFill(0xffffff);
        } else if (myTeamId === teamId) {
            boxesGfx?.beginFill(0x00ff00);
        } else {
            boxesGfx?.beginFill(0xff0000);
        }

        boxesGfx?.drawRect(
            box.xPercent * mapSprite.width + mapSprite.x,
            box.yPercent * mapSprite.height + mapSprite.y,
            box.widthPercent * mapSprite.width,
            box.heightPercent * mapSprite.height
        );
    }
}

function drawStartPositions() {
    if (!app.value || !mapSprite || !startPositionsGfx || !props.map) {
        return;
    }

    if (props.startPosType === StartPosType.Boxes) {
        startPositionsGfx.visible = false;
        return;
    } else {
        startPositionsGfx.visible = true;
        startPositionsGfx.clear();
    }

    const startPositions =
        props.startPositions ??
        props.map.startPositions?.map((pos) => {
            return {
                position: pos,
                rgbColor: { r: 255, g: 255, b: 255 },
            };
        }) ??
        [];

    for (const startPos of startPositions) {
        if (!startPos) {
            continue;
        }

        let color = 0xffffff;
        if (startPos.rgbColor) {
            color = rgb2hex([startPos.rgbColor.r / 255, startPos.rgbColor.g / 255, startPos.rgbColor.b / 255]);
        }
        startPositionsGfx.beginFill(color);

        const x = (startPos.position.x / (props.map.width * 512)) * mapSprite.width + mapSprite.x;
        const y = (startPos.position.z / (props.map.height * 512)) * mapSprite.height + mapSprite.y;
        const radius = 5;
        startPositionsGfx.drawEllipse(x - radius * 0.5, y - radius * 0.5, radius, radius);
    }
}
</script>

<style lang="scss" scoped>
.canvas-container {
    overflow: hidden;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
