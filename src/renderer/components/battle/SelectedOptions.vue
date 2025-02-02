<template>
    <div class="custom-game-options scroll-container">
        <div v-if="groupedBySection.size === 0" class="overriden-section">Default settings</div>
        <div v-for="[section, options] in groupedBySection.entries()" :key="section.name">
            <div class="overriden-section">{{ section.name }}</div>
            <div class="overriden-game-option" v-for="option in options" :key="option.key">
                <div>{{ option.name }}</div>
                <div class="value">{{ option.value }}</div>
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { LuaOption, LuaOptionSection } from "@main/content/game/lua-options";
import { battleStore } from "@renderer/store/battle.store";
import { gameStore } from "@renderer/store/game.store";
import { ref, watch } from "vue";

const groupedBySection = ref(new Map<LuaOptionSection, (LuaOption & { value: boolean | string | number })[]>());

watch(
    () => battleStore.battleOptions.gameMode.options,
    (overridenOptions) => {
        groupedBySection.value.clear();
        gameStore.selectedGameVersion.luaOptionSections.forEach((section) => {
            section.options.forEach((option) => {
                if (overridenOptions[option.key] !== undefined) {
                    if (!groupedBySection.value.has(section)) {
                        groupedBySection.value.set(section, []);
                    }
                    groupedBySection.value.get(section).push({ ...option, value: overridenOptions[option.key] });
                }
            });
        });
    },
    {
        deep: true,
    }
);
</script>

<style lang="scss" scoped>
.custom-game-options {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: smaller;
    color: #ffcc00;
}

.overriden-section {
    color: rgba(255, 255, 255, 0.5);
    font-weight: bold;
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
