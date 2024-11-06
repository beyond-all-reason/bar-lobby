<route lang="json5">
{ meta: { title: "Custom", order: 2, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <Panel class="flex-grow">
            <div class="flex-col flex-grow">
                <OfflineBattleComponent />
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import OfflineBattleComponent from "@renderer/components/battle/OfflineBattleComponent.vue";
import Panel from "@renderer/components/common/Panel.vue";
import { battleStore } from "@renderer/store/battle.store";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { getRandomMap } from "@renderer/store/maps.store";
import { onMounted } from "vue";

onMounted(async () => {
    if (!battleStore.battleOptions.engineVersion) {
        battleStore.battleOptions.engineVersion = enginesStore.latestEngineVersion.id;
    }
    if (!battleStore.battleOptions.gameVersion) {
        battleStore.battleOptions.gameVersion = gameStore.latestGameVersion.gameVersion;
    }
    if (!battleStore.battleOptions.map) {
        const randomMap = await getRandomMap();
        battleStore.battleOptions.map = randomMap;
    }
});
</script>

<style lang="scss" scoped></style>
