<template>
    <div class="flex-row gap-md">
        <Button class="gap-sm" @click="openGameOptions"> Advanced Settings <Icon :icon="settingsIcon" height="24" /> </Button>
        <!-- TODO: Exclude raptor and scavenger options from this menu with ?.filter((s) => s.key !== 'raptor_defense_options' && s.key !== 'scav_defense_options') -->
        <LuaOptionsModal
            id="game-options"
            title="Game Options"
            v-model="gameOptionsOpen"
            :options="battleStore.battleOptions.gameMode.options"
            :sections="gameStore.selectedGameVersion?.luaOptionSections"
            @set-options="onOptionsChanged"
        />
    </div>
</template>
<script lang="ts" setup>
import { LuaOption, LuaOptionSection } from "@main/content/game/lua-options";
import LuaOptionsModal from "@renderer/components/battle/LuaOptionsModal.vue";
import Button from "@renderer/components/controls/Button.vue";
import { battleStore } from "@renderer/store/battle.store";
import { gameStore } from "@renderer/store/game.store";
import { ref, watch } from "vue";
import settingsIcon from "@iconify-icons/mdi/settings";
import { Icon } from "@iconify/vue";

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

const gameOptionsOpen = ref(false);

async function openGameOptions() {
    gameOptionsOpen.value = true;
}

function onOptionsChanged(options: Record<string, boolean | string | number>) {
    battleStore.battleOptions.gameMode.options = options;
}
</script>

<style lang="scss" scoped>
.container {
    display: flex;
    flex-direction: row;
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
