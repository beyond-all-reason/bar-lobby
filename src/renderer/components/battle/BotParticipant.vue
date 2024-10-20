<template>
    <TeamParticipant @contextmenu="onRightClick">
        <div class="flex-row flex-center">
            <Icon :icon="robot" :height="16" />
        </div>
        <div>{{ bot.name }}</div>
    </TeamParticipant>
    <LuaOptionsModal
        :id="`configure-bot-${bot.name}`"
        v-model="botOptionsOpen"
        :luaOptions="bot.aiOptions"
        title="Configure Bot"
        :sections="botOptions"
        @set-options="setBotOptions"
    />
    <ContextMenu ref="menu" :model="actions" />
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import robot from "@iconify-icons/mdi/robot";
import { MenuItem } from "primevue/menuitem";
import { Ref, ref } from "vue";

import LuaOptionsModal from "@renderer/components/battle/LuaOptionsModal.vue";
import TeamParticipant from "@renderer/components/battle/TeamParticipant.vue";
import ContextMenu from "@renderer/components/common/ContextMenu.vue";
import { LuaOptionSection } from "@main/content/game/lua-options";
import { Bot } from "@main/game/battle/battle-types";

const props = defineProps<{
    bot: Bot;
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
    // battleStore.bots = battleStore.bots.filter((b) => b.battleStatus.participantId !== props.bot.battleStatus.participantId);
}

// Duplicates this bot and its settings and gives it a new player id.
function duplicateBot() {
    // const duplicatedBot = structuredClone(toRaw(props.bot));
    // duplicatedBot.battleStatus.participantId = battleWithMetadataStore.participants.length + 1;
    // battleStore.bots.push(duplicatedBot);
}

async function configureBot() {
    //TODO probably need a selected engine version store
    // const engineVersion = api.content.engine.installedVersions.find((version) => version.id === props.battle.battleOptions.engineVersion);
    // const ai = engineVersion?.ais.find((ai) => ai.name === props.bot.name);
    // if (ai) {
    //     botOptions.value = ai.options;
    //     botOptionsOpen.value = true;
    // }
}

function setBotOptions(options: Record<string, unknown>) {
    // props.battle.setBotOptions(props.bot.playerId, options);
}
</script>

<style lang="scss" scoped>
.bot-type {
    opacity: 0.5;
}
</style>
