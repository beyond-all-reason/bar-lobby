<template>
    <ContextMenu :entries="actions" :args="[bot]">
        <div class="participant" data-type="participant" @mouseenter.stop="onMouseEnter">
            <Icon :icon="robot" :height="16" />
            <div>{{ props.bot.name }}</div>
        </div>
        <LuaOptionsModal :id="`configure-bot-${bot.name}`" v-model="aiOptionsOpen" :luaOptions="bot.aiOptions" title="Configure Bot" :sections="aiOptions" @set-options="setBotOptions" />
    </ContextMenu>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import robot from "@iconify-icons/mdi/robot";
import { Ref, ref } from "vue";

import LuaOptionsModal from "@/components/battle/LuaOptionsModal.vue";
import ContextMenu, { ContextMenuEntry } from "@/components/common/ContextMenu.vue";
import { AbstractBattle } from "$/model/battle/abstract-battle";
import { Bot } from "$/model/battle/types";
import { LuaOptionSection } from "$/model/lua-options";

const props = defineProps<{
    battle: AbstractBattle;
    bot: Bot;
}>();

const aiOptions: Ref<LuaOptionSection[]> = ref([]);
const aiOptionsOpen = ref(false);

const kickAi = (bot: Bot) => {
    props.battle.removeBot(bot);
};

const configureAi = async (bot: Bot) => {
    await api.content.ai.processAis(props.battle.battleOptions.engineVersion);

    if (aiOptions.value.length === 0) {
        const ai = api.content.ai.getAis(props.battle.battleOptions.engineVersion)!.find((ai) => ai.shortName === bot.aiShortName)!;
        aiOptions.value = ai.options;
    }

    aiOptionsOpen.value = true;
};

const setBotOptions = (options: Record<string, unknown>) => {
    props.battle.setBotOptions(props.bot.name, options);
};

const actions: ContextMenuEntry[] = [
    { label: "Kick", action: kickAi },
    { label: "Configure", action: configureAi },
];

const onMouseEnter = () => {
    api.audio.getSound("button-hover").play();
};
</script>

<style lang="scss" scoped>
.participant {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    &.dragging {
        pointer-events: auto;
    }
    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
}
</style>
