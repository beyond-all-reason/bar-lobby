<template>
    <Select
        :data-key="'label'"
        :modelValue="battleStore.battleOptions.gameMode"
        :options="gameModeListOptions"
        optionLabel="label"
        label="Mode"
        @update:model-value="onGameModeSelected"
    />
</template>
<script lang="ts" setup>
import { GameMode } from "@main/game/battle/battle-types";
import Select from "@renderer/components/controls/Select.vue";
import { battleActions, battleStore } from "@renderer/store/battle.store";

//TODO have theses presets come from the game
const gameModeListOptions: GameMode[] = [
    { label: "Skirmish", options: {} },
    { label: "FFA", options: {} },
    { label: "Raptors", options: {} },
    { label: "Scavengers", options: {} },
];

async function onGameModeSelected(gameMode: GameMode) {
    await battleActions.loadGameMode(gameMode.label);
    // battleStore.battleOptions.gameMode = gameMode;
}
</script>

<style lang="scss" scoped></style>
