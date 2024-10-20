<template>
    <div ref="canvasContainerEl" class="canvas-container"></div>
</template>

<script lang="ts" setup>
import { useElementSize } from "@vueuse/core";
import { Application, Assets, Graphics, Sprite, Texture, Color } from "pixi.js";
import { onMounted, onUnmounted, useTemplateRef, watch } from "vue";
import { MapData } from "@main/content/maps/map-data";
import { StartBox, StartPosType } from "@main/game/battle/battle-types";
import { MIPMAP_SIZE } from "@main/config/map-parsing";
import { mePlayer } from "@renderer/store/battle.store";

const props = defineProps<{
    map?: MapData;
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

const canvasContainerEl = useTemplateRef<HTMLDivElement>("canvasContainerEl");
const parentSize = useElementSize(canvasContainerEl);

let app: Application;
let mapSprite: Sprite;
const boxesGfx = new Graphics();
const startPositionsGfx = new Graphics();

onMounted(async () => {
    app = new Application();
    await app.init({
        background: "#000",
        backgroundAlpha: 0.3,
        antialias: true,
        resizeTo: canvasContainerEl.value,
    });
    app.canvas.style.position = "absolute";
    app.stage.addChild(boxesGfx);
    app.stage.addChild(startPositionsGfx);
    setMapImage();
    canvasContainerEl.value.appendChild(app.canvas);
});

onUnmounted(() => {
    // make sure pixi app is properly destroyed after out transition has finished
    app.destroy(true);
});

watch([parentSize.width, parentSize.height], ([width, height]) => {
    if (width && height) {
        onResize();
    }
});

watch(() => props.map, setMapImage, { deep: true });
watch(() => props.startBoxes, drawBoxes, { deep: true });
watch(() => props.startPositions, drawStartPositions);
watch(
    () => mePlayer.battleStatus.teamId,
    () => {
        drawBoxes();
        drawStartPositions();
    }
);
watch(
    () => props.startPosType,
    () => {
        drawBoxes();
        drawStartPositions();
    }
);

function onResize() {
    if (app.resize) {
        app.resize();
    }
    resizeMapImage();
    drawBoxes();
    drawStartPositions();
}

async function setMapImage() {
    if (!props.map) {
        return;
    }
    if (mapSprite) {
        app.stage.removeChild(mapSprite);
    }
    const texture = await Assets.load<Texture>(props.map.images.texture);
    mapSprite = Sprite.from(texture);
    mapSprite.setSize({
        width: props.map.width * MIPMAP_SIZE * 16,
        height: props.map.height * MIPMAP_SIZE * 16,
    });
    app.stage.addChildAt(mapSprite, 0);
    onResize();
}

function resizeMapImage() {
    if (!mapSprite) {
        return;
    }
    if (mapSprite.width > mapSprite.height) {
        mapSprite.width = app.canvas.width;
        mapSprite.scale.y = mapSprite.scale.x;
    } else {
        mapSprite.height = app.canvas.height;
        mapSprite.scale.x = mapSprite.scale.y;
    }
    mapSprite.x = app.canvas.width * 0.5 - mapSprite.width * 0.5;
    mapSprite.y = app.canvas.height * 0.5 - mapSprite.height * 0.5;
}

function drawBoxes() {
    if (!boxesGfx || !mapSprite) {
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
    const isSpectator = mePlayer.battleStatus.isSpectator;
    const myTeamId = mePlayer.battleStatus.teamId;
    for (const teamId in props.startBoxes) {
        const box = props.startBoxes[teamId];
        if (!box) {
            continue;
        }
        if (isSpectator) {
            boxesGfx?.fill(0xffffff);
        } else if (myTeamId === teamId) {
            boxesGfx?.fill(0x00ff00);
        } else {
            boxesGfx?.fill(0xff0000);
        }
        boxesGfx?.rect(
            box.xPercent * mapSprite.width + mapSprite.x,
            box.yPercent * mapSprite.height + mapSprite.y,
            box.widthPercent * mapSprite.width,
            box.heightPercent * mapSprite.height
        );
    }
}

function drawStartPositions() {
    if (!mapSprite || !startPositionsGfx || !props.map) {
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
        let color = Color.shared.setValue(0xffffff);
        if (startPos.rgbColor) {
            color = new Color([startPos.rgbColor.r / 255, startPos.rgbColor.g / 255, startPos.rgbColor.b / 255]);
        }
        startPositionsGfx.fill(color);
        const x = (startPos.position.x / (props.map.width * 512)) * mapSprite.width + mapSprite.x;
        const y = (startPos.position.z / (props.map.height * 512)) * mapSprite.height + mapSprite.y;
        const radius = 5;
        startPositionsGfx.ellipse(x - radius * 0.5, y - radius * 0.5, radius, radius);
    }
}
</script>

<style lang="scss" scoped>
.canvas-container {
    border: 1px solid rgba(255, 255, 255, 0.1);
    width: 100%;
    height: 100%;
}
</style>
