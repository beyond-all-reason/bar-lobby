<template>
    <ContextMenu :entries="getActions(participant)" :args="[participant]">
        <div v-tooltip.bottom="syncStatus" class="participant" data-type="participant">
            <Icon v-if="isBot(participant)" :icon="robot" :height="16" />
            <Flag v-if="!isBot(participant) && participant.countryCode" class="flag" :countryCode="participant.countryCode" />
            <div>{{ name }}</div>
            <div v-if="!isBot(participant) && !isSpec">
                <div class="ready" :class="{ isReady: participant.battleStatus.ready }">⬤</div>
            </div>
            <Icon v-if="!isBot(participant) && !isSpec && !isSynced" :icon="syncAlert" :height="16" color="#f00" />
        </div>
        <LuaOptionsModal
            v-if="isBot(participant)"
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
import robot from "@iconify-icons/mdi/robot";
import syncAlert from "@iconify-icons/mdi/sync-alert";
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
const isBot = (participant: User | Bot): participant is Bot => !("userId" in participant);
const isSpec = computed(() => "userId" in props.participant && props.participant.battleStatus.isSpectator);
const name = computed(() => ("userId" in participant.value ? participant.value.username : participant.value.name));
const isSynced = computed(() => {
    if ("userId" in props.participant) {
        const syncStatus = props.participant.battleStatus.sync;
        return syncStatus.engine === 1 && syncStatus.game === 1 && syncStatus.map === 1;
    }
    return false;
});
const syncStatus = computed(() => {
    if (isBot(props.participant)) {
        return;
    }
    return `Engine: ${props.participant.battleStatus.sync.engine * 100}%\nGame: ${props.participant.battleStatus.sync.game * 100}%\nMap: ${props.participant.battleStatus.sync.map * 100}%`;
});

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
.flag {
    width: 16px;
}
.ready {
    font-size: 12px;
    color: rgb(226, 0, 0);
    &.isReady {
        color: rgb(121, 226, 0);
    }
}
</style>
