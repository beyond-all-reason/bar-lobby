<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="bot-participant" @contextmenu="onRightClick">
        <TeamParticipant>
            <div class="flex-row flex-center">
                <GameIconsVelociraptor v-if="isRaptor(bot)" />
                <Icon v-else-if="isScavenger(bot)" :icon="robotAngry" />
                <Icon v-else :icon="robot" />
            </div>
            <div class="bot-name">{{ bot.name }}</div>
            <div v-if="hasInlineControls" class="bot-controls">
                <label class="bot-control">
                    <span>{{ t("lobby.components.battle.botParticipant.faction") }}</span>
                    <Select
                        data-test="bot-faction"
                        :modelValue="bot.faction"
                        :options="factionOptions"
                        optionLabel="name"
                        optionValue="value"
                        @update:model-value="setBotFaction"
                    />
                </label>
                <label v-if="difficultyOption" class="bot-control">
                    <span>{{ difficultyOption.name }}</span>
                    <Select
                        data-test="bot-difficulty"
                        :modelValue="bot.aiOptions[difficultyOption.key] ?? difficultyOption.default"
                        :options="difficultyOption.options"
                        optionLabel="name"
                        optionValue="key"
                        @update:model-value="setDifficulty"
                    />
                </label>
            </div>
        </TeamParticipant>
        <LuaOptionsModal
            :id="`configure-bot-${bot.name}`"
            :title="t('lobby.components.battle.botParticipant.configureBot')"
            v-model="botOptionsOpen"
            :options="bot.aiOptions"
            :sections="botOptions"
            @set-options="setBotOptions"
        />
        <ContextMenu ref="menu" :model="actions" />
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import robot from "@iconify-icons/mdi/robot";
import robotAngry from "@iconify-icons/mdi/robot-angry";
import { computed, Ref, ref } from "vue";
import { useTypedI18n } from "@renderer/i18n";

import LuaOptionsModal from "@renderer/components/battle/LuaOptionsModal.vue";
import TeamParticipant from "@renderer/components/battle/TeamParticipant.vue";
import { LuaOptionList, LuaOptionSection } from "@main/content/game/lua-options";
import { Bot, Faction, isRaptor, isScavenger } from "@main/game/battle/battle-types";
import ContextMenu from "primevue/contextmenu";
import { battleActions } from "@renderer/store/battle.store";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import GameIconsVelociraptor from "@renderer/components/icons/GameIconsVelociraptor.vue";
import Select from "@renderer/components/controls/Select.vue";

const { t } = useTypedI18n();

const props = defineProps<{
    bot: Bot;
    teamId: number;
}>();

const botOptions: Ref<LuaOptionSection[]> = ref([]);
const botOptionsOpen = ref(false);
const menu = ref<InstanceType<typeof ContextMenu>>();

const factionOptions = [
    { name: Faction.Armada, value: Faction.Armada },
    { name: Faction.Cortex, value: Faction.Cortex },
    { name: Faction.Legion, value: Faction.Legion },
];

const hasInlineControls = computed(() => !isRaptor(props.bot) && !isScavenger(props.bot));
const difficultyOption = computed(() => {
    return getBotOptions()
        .flatMap((section) => section.options)
        .find((option): option is LuaOptionList => option.key === "difficulty" && option.type === "list" && !option.hidden);
});

const actions = [
    {
        label: t("lobby.components.battle.botParticipant.configure"),
        command: configureBot,
    },
    {
        label: t("lobby.components.battle.botParticipant.duplicate"),
        command: duplicateBot,
    },
    {
        label: t("lobby.components.battle.botParticipant.kick"),
        command: kickBot,
    },
];

function onRightClick(event: MouseEvent) {
    if (menu.value) {
        menu.value.show(event);
    }
}

function kickBot() {
    battleActions.removeBot(props.bot);
}

// Duplicates this bot and its settings and gives it a new player id.
function duplicateBot() {
    battleActions.duplicateBot(props.bot, props.teamId);
}

async function configureBot() {
    botOptions.value = getBotOptions();
    botOptionsOpen.value = true;
}

function setBotOptions(options: Record<string, unknown>) {
    if (!battleActions.updateBotOptions(props.bot, options)) {
        botOptionsOpen.value = false;
    }
}

function setBotFaction(faction: Faction | undefined) {
    battleActions.updateBotFaction(props.bot, faction);
}

function setDifficulty(difficulty: string) {
    if (!difficultyOption.value) return;

    const options = { ...props.bot.aiOptions, [difficultyOption.value.key]: difficulty };
    if (difficulty === difficultyOption.value.default) {
        delete options[difficultyOption.value.key];
    }
    battleActions.updateBotOptions(props.bot, options);
}

function getBotOptions() {
    return (
        [...(enginesStore.selectedEngineVersion?.ais || []), ...(gameStore.selectedGameVersion?.ais || [])].find(
            (ai) => ai.name === props.bot.name
        )?.options || []
    );
}
</script>

<style lang="scss" scoped>
.bot-participant {
    height: 100%;
}

.bot-name {
    flex: 1;
}

.bot-controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(120px, 1fr));
    gap: 8px;
    margin-left: auto;
}

.bot-control {
    display: grid;
    grid-template-columns: auto minmax(100px, 1fr);
    align-items: center;
    gap: 5px;
    font-size: 12px;
}

.bot-type {
    opacity: 0.5;
}
</style>
