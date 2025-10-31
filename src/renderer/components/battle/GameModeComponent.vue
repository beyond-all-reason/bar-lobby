<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="container">
        <Select
            :data-key="'label'"
            :modelValue="battleStore.battleOptions.gameMode"
            :options="gameModeListOptions"
            optionLabel="label"
            :label="t('lobby.components.battle.gameModeComponent.presets')"
            @update:model-value="onGameModeSelected"
            disabled
        />
        <div class="custom-game-options scroll-container">
            <div v-for="[section, options] in groupedBySection.entries()" :key="section.name">
                <div class="overriden-section">{{ section.name }}</div>
                <div class="overriden-game-option" v-for="option in options" :key="option.key">
                    <div>{{ option.name }}</div>
                    <div class="value">{{ option.value }}</div>
                </div>
            </div>
        </div>
        <Button class="fullwidth" @click="openGameOptions">{{
            t("lobby.components.battle.gameModeComponent.configureGameOptions")
        }}</Button>
        <LuaOptionsModal
            id="game-options"
            :title="t('lobby.components.battle.gameModeComponent.gameOptions')"
            v-model="gameOptionsOpen"
            :options="battleStore.battleOptions.gameMode.options"
            :sections="gameStore.selectedGameVersion?.luaOptionSections || []"
            @set-options="onOptionsChanged"
        />
    </div>
</template>
<script lang="ts" setup>
import { LuaOption, LuaOptionSection } from "@main/content/game/lua-options";
import { type GameModeWithOptions, GameMode } from "@main/game/battle/battle-types";
import LuaOptionsModal from "@renderer/components/battle/LuaOptionsModal.vue";
import Button from "@renderer/components/controls/Button.vue";
import Select from "@renderer/components/controls/Select.vue";
import { battleActions, battleStore } from "@renderer/store/battle.store";
import { gameStore } from "@renderer/store/game.store";
import { ref, watch } from "vue";
import { useTypedI18n } from "@renderer/i18n";

const { t } = useTypedI18n();

//TODO have theses presets come from the game
const gameModeListOptions: GameModeWithOptions[] = [
    { label: t("lobby.components.battle.gameModeComponent.gamemode-classic"), options: {} },
    { label: t("lobby.components.battle.gameModeComponent.gamemode-ffa"), options: {} },
    { label: t("lobby.components.battle.gameModeComponent.gamemode-raptors"), options: {} },
    { label: t("lobby.components.battle.gameModeComponent.gamemode-scavengers"), options: {} },
];

const groupedBySection = ref(new Map<LuaOptionSection, (LuaOption & { value: boolean | string | number })[]>());
watch(
    () => battleStore.battleOptions.gameMode.options,
    (overridenOptions) => {
        groupedBySection.value.clear();
        gameStore.selectedGameVersion?.luaOptionSections.forEach((section) => {
            section.options.forEach((option) => {
                if (overridenOptions[option.key] !== undefined) {
                    if (!groupedBySection.value.has(section)) {
                        groupedBySection.value.set(section, []);
                    }
                    groupedBySection.value.get(section)?.push({ ...option, value: overridenOptions[option.key] });
                }
            });
        });
    },
    {
        deep: true,
    }
);
const gameOptionsOpen = ref(false);
async function openGameOptions() {
    gameOptionsOpen.value = true;
}
async function onGameModeSelected(gameMode: GameModeWithOptions) {
    await battleActions.loadGameMode(gameMode.label);
}

function onOptionsChanged(options: Record<string, boolean | string | number>) {
    battleStore.battleOptions.gameMode.options = options;
}
</script>

<style lang="scss" scoped>
.container {
    height: 100%;
    display: flex;
    flex-direction: column;
}
.custom-game-options {
    padding: 10px;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background-color: rgba(0, 0, 0, 0.3);
    gap: 2px;
    font-size: smaller;
    color: #ffcc00;
}
.overriden-section {
    color: rgba(255, 255, 255, 0.5);
    font-weight: bold;
    padding: 5px;
}
.overriden-game-option {
    display: flex;
    justify-content: space-between;
    gap: 20px;
}
.value {
    overflow-x: hidden;
    text-overflow: ellipsis;
}
</style>
