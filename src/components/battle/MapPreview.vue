<template>
    <div id="map-canvas-container" class="map-canvas-container">
        <canvas id="map-canvas" />
        <div class="map-toolbar">
            <Select v-model="startPosType" :options="startPosOptions" :label-by="(option: any) => option.label" :value-by="(option: any) => option.value" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import * as PIXI from "pixi.js";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { MapData } from "@/model/map-data";
import { BattleTypes } from "@/model/battle";
import Select from "@/components/inputs/Select.vue";

const battle = window.api.battle.currentBattle;

const startPosType = ref(battle.hostOptions.startPosType);
const startPosOptions: Array<{ label: string, value: any }> = [
    { label: "Fixed", value: BattleTypes.StartPosType.Fixed },
    { label: "Random", value: BattleTypes.StartPosType.Random },
    { label: "Boxes", value: BattleTypes.StartPosType.ChooseInGame }
];

let app: PIXI.Application;
let mapSprite: PIXI.Sprite;
let startBoxesGraphics: PIXI.Graphics;

onMounted(async () => {
    const canvasContainerEl = document.getElementById("map-canvas-container") as HTMLElement;
    const canvasEl = document.getElementById("map-canvas") as HTMLCanvasElement;

    app = (window as any).app = new PIXI.Application({
        view: canvasEl,
        width: 600,
        height: 600
    });

    startBoxesGraphics = new PIXI.Graphics();
    app.stage.addChild(startBoxesGraphics);

    loadMap();

    // TODO: only watch necessary properties and update relevant bits
    watch(battle, () => {
        loadMap();
    });

    app.ticker.add(() => {
        console.log("tick");
    });
});

onUnmounted(() => {
    app.destroy();
});

async function loadMap() {
    console.log("loading map");
    unload();

    const map = window.api.content.maps.getMapByFileName(battle.hostOptions.mapFileName);

    if (!map || !map.textureImagePath) {
        // TODO show missing map image
        return;
    }

    await loadImages(map);

    const baseTexture = PIXI.BaseTexture.from("textureMap");
    const aspectRatio = baseTexture.width / baseTexture.height;
    baseTexture.width = app.view.width;
    baseTexture.height = app.view.width / aspectRatio;
    // TODO: test with long vertical map
    mapSprite = (window as any).sprite = PIXI.Sprite.from(baseTexture);
    app.stage.addChildAt(mapSprite, 0);
    mapSprite.y = (app.view.height * 0.5) - (mapSprite.height * 0.5);
    mapSprite.addChild(startBoxesGraphics);

    startBoxesGraphics.clear();
    if (battle.hostOptions.startPosType === BattleTypes.StartPosType.ChooseInGame) {
        for (const allyTeam of battle.allyTeams) {
            if (allyTeam.startBox) {
                drawStartBox(allyTeam.startBox);
            }
        }
    }
}

function unload() {
    if (mapSprite) {
        mapSprite.destroy();
    }

    app.loader.reset();
    app.loader.destroy();
    for (const res in app.loader.resources) {
        delete app.loader.resources[res];
    }

    PIXI.utils.clearTextureCache();
}

function drawStartBox(startBox: BattleTypes.StartBox) {
    startBoxesGraphics.beginFill(0x00ff00, 0.3);
    startBoxesGraphics.drawRect(
        startBox.xPercent * mapSprite.width,
        startBox.yPercent * mapSprite.height,
        startBox.widthPercent * mapSprite.width,
        startBox.heightPercent * mapSprite.height
    );
}

function loadImages(map: MapData) {
    return new Promise<void>(resolve => {
        if (map.textureImagePath) {
            app.loader.add("textureMap", map.textureImagePath);
        }
        if (map.heightImagePath) {
            app.loader.add("heightMap", map.heightImagePath);
        }
        if (map.metalImagePath) {
            app.loader.add("metalMap", map.metalImagePath);
        }
        if (map.typeImagePath) {
            app.loader.add("typeMap", map.typeImagePath);
        }

        app.loader.load(() => resolve());
    });
}
</script>