<template>
    <div id="map-canvas-container" class="map-canvas-container">
        <canvas id="map-canvas" />
        <div class="map-toolbar">
            <Options v-model="battle.hostOptions.startPosType" required>
                <Option :value="BattleTypes.StartPosType.Fixed">
                    Fixed
                </Option>
                <Option :value="BattleTypes.StartPosType.Random">
                    Random
                </Option>
                <Option :value="BattleTypes.StartPosType.ChooseInGame">
                    Boxes
                </Option>
            </Options>
        </div>
    </div>
</template>

<script lang="ts" setup>
// import * as PIXI from "pixi.js";
// import { MapData } from "@/model/map-data";
import { BattleTypes } from "@/model/battle";
import { onMounted, watch } from "vue";
import Options from "@/components/inputs/Options.vue";
import Option from "@/components/inputs/Option.vue";

const battle = window.api.battle.currentBattle;

const startPosOptions: Array<{ label: string, value: any }> = [
    { label: "Fixed", value: BattleTypes.StartPosType.Fixed },
    { label: "Random", value: BattleTypes.StartPosType.Random },
    { label: "Boxes", value: BattleTypes.StartPosType.ChooseInGame }
];

type Transform = { x: number, y: number, width: number, height: number };

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
let textureMap: HTMLImageElement;
let mapTransform: Transform;

onMounted(async () => {
    canvas = document.getElementById("map-canvas") as HTMLCanvasElement;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.width;
    context = canvas.getContext("2d")!;

    loadMap();

    watch(battle, () => {
        loadMap();
    });
});

async function loadMap() {
    reset();

    const mapData = window.api.content.maps.getMapByFileName(battle.hostOptions.mapFileName);
    if (!mapData || !mapData.textureImagePath) {
        // TODO: missing map image
        return;
    }

    textureMap = await loadImage(mapData.textureImagePath);

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

    context.drawImage(textureMap, mapTransform.x, mapTransform.y, mapTransform.width, mapTransform.height);

    drawBoxes();
}

function drawBoxes() {
    if (battle.hostOptions.startPosType !== BattleTypes.StartPosType.ChooseInGame) {
        return;
    }

    for (const allyTeam of battle.allyTeams) {
        if (allyTeam.startBox) {
            if (allyTeam.teams.find(team => team.players.find(player => player.name === battle.hostOptions.myPlayerName))) {
                context.fillStyle = "rgba(0, 255, 0, 0.3)";
            } else {
                context.fillStyle = "rgba(255, 0, 0, 0.3)";
            }

            context.strokeStyle = "rgba(255, 255, 255, 0.5)";
            context.lineWidth = 1;

            let boxTransform = {
                x: mapTransform.x + mapTransform.width * allyTeam.startBox.xPercent,
                y: mapTransform.y + mapTransform.height * allyTeam.startBox.yPercent,
                width: mapTransform.width * allyTeam.startBox.widthPercent,
                height: mapTransform.height * allyTeam.startBox.heightPercent
            };
            boxTransform = roundTransform(boxTransform);
            console.log(mapTransform, boxTransform);
            context.fillRect(boxTransform.x, boxTransform.y, boxTransform.width, boxTransform.height);
            //context.strokeRect(boxTransform.x, boxTransform.y, boxTransform.width, boxTransform.height);
        }
    }
}

function reset() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function loadImage(url: string) {
    return new Promise<HTMLImageElement>(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = url;
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

// let app: PIXI.Application;
// let mapSprite: PIXI.Sprite;
// let startBoxesGraphics: PIXI.Graphics;

// onMounted(async () => {
//     const canvasContainerEl = document.getElementById("map-canvas-container") as HTMLElement;
//     const canvasEl = document.getElementById("map-canvas") as HTMLCanvasElement;

//     app = (window as any).app = new PIXI.Application({
//         view: canvasEl,
//         width: 600,
//         height: 600
//     });

//     startBoxesGraphics = new PIXI.Graphics();
//     app.stage.addChild(startBoxesGraphics);

//     loadMap();

//     // TODO: only watch necessary properties and update relevant bits
//     watch(battle, () => {
//         loadMap();
//     });

//     app.ticker.add(() => {
//         console.log("tick");
//     });
// });

// onUnmounted(() => {
//     app.destroy();
// });

// async function loadMap() {
//     console.log("loading map");
//     unload();

//     const map = window.api.content.maps.getMapByFileName(battle.hostOptions.mapFileName);

//     if (!map || !map.textureImagePath) {
//         // TODO show missing map image
//         return;
//     }

//     await loadImages(map);

//     const baseTexture = PIXI.BaseTexture.from("textureMap");
//     const aspectRatio = baseTexture.width / baseTexture.height;
//     baseTexture.width = app.view.width;
//     baseTexture.height = app.view.width / aspectRatio;
//     // TODO: test with long vertical map
//     mapSprite = (window as any).sprite = PIXI.Sprite.from(baseTexture);
//     app.stage.addChildAt(mapSprite, 0);
//     mapSprite.y = (app.view.height * 0.5) - (mapSprite.height * 0.5);
//     mapSprite.addChild(startBoxesGraphics);

//     startBoxesGraphics.clear();
//     if (battle.hostOptions.startPosType === BattleTypes.StartPosType.ChooseInGame) {
//         for (const allyTeam of battle.allyTeams) {
//             if (allyTeam.startBox) {
//                 drawStartBox(allyTeam.startBox);
//             }
//         }
//     }
// }

// function unload() {
//     if (mapSprite) {
//         mapSprite.destroy();
//     }

//     app.loader.reset();
//     app.loader.destroy();
//     for (const res in app.loader.resources) {
//         delete app.loader.resources[res];
//     }

//     PIXI.utils.clearTextureCache();
// }

// function drawStartBox(startBox: BattleTypes.StartBox) {
//     startBoxesGraphics.beginFill(0x00ff00, 0.3);
//     startBoxesGraphics.drawRect(
//         startBox.xPercent * mapSprite.width,
//         startBox.yPercent * mapSprite.height,
//         startBox.widthPercent * mapSprite.width,
//         startBox.heightPercent * mapSprite.height
//     );
// }

// function loadImages(map: MapData) {
//     return new Promise<void>(resolve => {
//         if (map.textureImagePath) {
//             app.loader.add("textureMap", map.textureImagePath);
//         }
//         if (map.heightImagePath) {
//             app.loader.add("heightMap", map.heightImagePath);
//         }
//         if (map.metalImagePath) {
//             app.loader.add("metalMap", map.metalImagePath);
//         }
//         if (map.typeImagePath) {
//             app.loader.add("typeMap", map.typeImagePath);
//         }

//         app.loader.load(() => resolve());
//     });
// }
</script>