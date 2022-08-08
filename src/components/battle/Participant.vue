<template>
    <ContextMenu :entries="getActions(participant)" :args="[participant]">
        <div class="participant" data-type="participant">
            <Icon :icon="!('userId' in participant) ? robot : account" :height="16" />
            <Flag :countryCode="countryCode" />
            <div>
                {{ name }}
            </div>
        </div>
        <LuaOptionsModal
            v-if="!('userId' in participant)"
            :id="`configure-bot-${participant.name}`"
            v-model="aiOptionsOpen"
            :luaOptions="participant.aiOptions"
            title="Configure Bot"
            :sections="aiOptions"
            @set-options="setBotOptions"
        />
    </ContextMenu>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import account from "@iconify-icons/mdi/account";
import robot from "@iconify-icons/mdi/robot";
import { computed, Ref, ref, toRef } from "vue";

import LuaOptionsModal from "@/components/battle/LuaOptionsModal.vue";
import ContextMenu, { ContextMenuEntry } from "@/components/common/ContextMenu.vue";
import Flag from "@/components/misc/Flag.vue";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot } from "@/model/battle/types";
import { LuaOptionSection } from "@/model/lua-options";
import { User } from "@/model/user";

const props = defineProps<{
    battle: AbstractBattle;
    participant: User | Bot;
}>();

const participant = toRef(props, "participant");

const user = computed(() => {
    if ("userId" in props.participant) {
        return api.session.getUserById(props.participant.userId);
    }
    return undefined;
});

const name = computed(() => ("userId" in participant.value ? participant.value.username : participant.value.name));

const countryCode = ref("");
const aiOptions: Ref<LuaOptionSection[]> = ref([]);
const aiOptionsOpen = ref(false);

const viewProfile = (player: User) => {
    //
};

const kickPlayer = (player: User) => {
    //
};

const messagePlayer = (player: User) => {
    //
};

const blockPlayer = (player: User) => {
    //
};

const addFriend = (player: User) => {
    //
};

const reportPlayer = (player: User) => {
    //
};

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
    if (!("userId" in props.participant)) {
        props.battle.setBotOptions(props.participant.name, options);
    }
};

const playerActions: ContextMenuEntry[] = [
    { label: "View Profile", action: viewProfile },
    { label: "Message", action: messagePlayer },
    { label: "Kick", action: kickPlayer },
    { label: "Block", action: blockPlayer },
    { label: "Add Friend", action: addFriend },
    { label: "Report", action: reportPlayer },
];

const selfActions: ContextMenuEntry[] = [{ label: "View Profile", action: viewProfile }];

const botActions: ContextMenuEntry[] = [
    { label: "Kick", action: kickAi },
    { label: "Configure", action: configureAi },
];

const getActions = (participant: User | Bot) => {
    if (!("userId" in participant)) {
        return botActions;
    } else {
        if (participant.userId === api.session.currentUser.userId) {
            return selfActions;
        } else {
            return playerActions;
        }
    }
};
</script>

<style lang="scss" scoped>
.participant {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 7px;
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
