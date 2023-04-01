<template>
    <TeamParticipant :battle="battle" @contextmenu="onRightClick">
        <Icon :icon="robot" :height="16" />
        <div>{{ getAiFriendlyName(props.bot.aiShortName) }}</div>
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

import LuaOptionsModal from "@/components/battle/LuaOptionsModal.vue";
import TeamParticipant from "@/components/battle/TeamParticipant.vue";
import ContextMenu from "@/components/common/ContextMenu.vue";
import { getAiFriendlyName } from "@/model/ai";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot } from "@/model/battle/battle-types";
import { LuaOptionSection } from "@/model/lua-options";

const props = defineProps<{
    battle: AbstractBattle;
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
    props.battle.removeBot(props.bot);
}

async function configureBot() {
    const engine = props.battle.battleOptions.engineVersion;
    await api.content.ai.processAis(engine);
    const ai = api.content.ai.getEngineAI(props.bot.aiShortName, engine);
    if (ai) {
        botOptions.value = ai.options;
        botOptionsOpen.value = true;
    }
}

function setBotOptions(options: Record<string, unknown>) {
    props.battle.setBotOptions(props.bot.name, options);
}
</script>

<style lang="scss" scoped>
.bot-type {
    opacity: 0.5;
}
</style>
