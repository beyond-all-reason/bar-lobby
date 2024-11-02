<route lang="json5">
{ meta: { title: "Pixi Map" } }
</route>

<template>
    <div class="view">
        <Panel class="flex-grow">
            <div class="container">
                <MapPreview :map="redComet" :startBoxes="boxes" :startPositions="positions"></MapPreview>
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { StartBox } from "@main/game/battle/battle-types";
import Panel from "@renderer/components/common/Panel.vue";
import MapPreview from "@renderer/components/maps/MapPreview.vue";
import { db } from "@renderer/store/db";

const redComet = await db.maps.get("Red Comet Remake 1.8");
const boxes: Record<number, StartBox | undefined> = {
    0: { xPercent: 0, yPercent: 0, widthPercent: 0.2, heightPercent: 1 },
    1: { xPercent: 0.8, yPercent: 0, widthPercent: 0.2, heightPercent: 1 },
};
const positions: (
    | {
          position: {
              x: number;
              z: number;
          };
          rgbColor?:
              | {
                    r: number;
                    g: number;
                    b: number;
                }
              | undefined;
      }
    | undefined
)[] = [
    {
        position: {
            x: 200,
            z: 3500,
        },
        rgbColor: {
            r: 255,
            g: 0,
            b: 0,
        },
    },
    {
        position: {
            x: 5500,
            z: 400,
        },
        rgbColor: {
            r: 0,
            g: 255,
            b: 0,
        },
    },
];
</script>

<style lang="scss" scoped>
.container {
    width: 100%;
    height: 500px;
    background: green;
    display: flex;
    gap: 10px;
}
</style>
