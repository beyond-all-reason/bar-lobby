<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <MapBattlePreview :map="map" :map-options="mapOptions">
        <template #boxes="{ boxes }">
            <MapBattlePreviewStartBox
                v-for="(box, index) in boxes"
                :key="`box${index}`"
                :id="index"
                :box="box"
                @update:box="(updatedBox) => updateBox(index, updatedBox)"
            />
        </template>
    </MapBattlePreview>
</template>

<script setup lang="ts">
import { BattleOptions } from "@main/game/battle/battle-types";
import { MapData } from "@main/content/maps/map-data";
import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";
import MapBattlePreviewStartBox from "@renderer/components/maps/MapBattlePreviewStartBox.vue";
import { getCurrentStartBoxes } from "@renderer/utils/battle-map-options";
import { StartBox } from "tachyon-protocol/types";

const props = defineProps<{
    map?: MapData;
    mapOptions: BattleOptions["mapOptions"];
}>();

const emit = defineEmits<{
    (event: "update:mapOptions", mapOptions: BattleOptions["mapOptions"]): void;
}>();

function updateBox(index: number, box: StartBox) {
    const boxes = getCurrentStartBoxes(props.map, props.mapOptions).map((currentBox) => ({ ...currentBox }));
    boxes[index] = { ...box };

    emit("update:mapOptions", {
        ...props.mapOptions,
        startBoxesIndex: undefined,
        customStartBoxes: boxes,
    });
}
</script>
