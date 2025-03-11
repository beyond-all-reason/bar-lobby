<template>
    <div @contextmenu="onRightClick">
        <TeamParticipant>
            <div class="flex-row flex-center">
                <GameIconsVelociraptor v-if="isRaptor(bot)" />
                <Icon v-else-if="isScavenger(bot)" :icon="robotAngry" />
                <Icon v-else :icon="robot" />
            </div>
            <div>{{ bot.name }}</div>
        </TeamParticipant>
        <LuaOptionsModal
            :id="`configure-bot-${bot.name}`"
            title="Configure Bot"
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
import { MenuItem } from "primevue/menuitem";
import { Ref, ref } from "vue";

import LuaOptionsModal from "@renderer/components/battle/LuaOptionsModal.vue";
import TeamParticipant from "@renderer/components/battle/TeamParticipant.vue";
import { LuaOptionSection } from "@main/content/game/lua-options";
import { Bot, isRaptor, isScavenger } from "@main/game/battle/battle-types";
import ContextMenu from "primevue/contextmenu";
import { battleActions } from "@renderer/store/battle.store";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import GameIconsVelociraptor from "@renderer/components/icons/GameIconsVelociraptor.vue";

const props = defineProps<{
    bot: Bot;
    teamId: number;
}>();

const botOptions: Ref<LuaOptionSection[]> = ref([]);
const botOptionsOpen = ref(false);
const menu = ref<InstanceType<typeof ContextMenu>>();

const actions: MenuItem[] = [
    {
        label: "Configure",
        command: configureBot,
    },
    {
        label: "Duplicate",
        command: duplicateBot,
    },
    {
        label: "Kick",
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
    botOptions.value =
        [...enginesStore.selectedEngineVersion.ais, ...gameStore.selectedGameVersion.ais].find((ai) => ai.name === props.bot.name)
            ?.options || [];
    botOptionsOpen.value = true;
}

function setBotOptions(options: Record<string, unknown>) {
    battleActions.updateBotOptions(props.bot, options);
}
</script>

<style lang="scss" scoped>
.bot-type {
    opacity: 0.5;
}
</style>
