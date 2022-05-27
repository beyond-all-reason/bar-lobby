<template>
    <ContextMenu :entries="getActions(participant)" :args="[participant]">
        <div class="participant">
            <Icon :icon="props.participant.type === 'bot' ? robot : account" :height="16" />
            <Flag :countryCode="countryCode" />
            <div>
                {{ name }}
            </div>
        </div>
        <LuaOptionsModal
            v-if="participant.type === 'bot'"
            :id="`configure-bot-${participant.name}`"
            v-model="aiOptionsOpen"
            v-model:luaOptions="participant.aiOptions"
            title="Configure Bot"
            :sections="aiOptions"
            @update:lua-options="aiOptionsUpdated"
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
import { Bot, Player, Spectator } from "@/model/battle/participants";
import { LuaOptionSection } from "@/model/lua-options";

const props = defineProps<{
    participant: Player | Bot | Spectator;
}>();

const participant = toRef(props, "participant");

const battle = api.session.currentBattle;

const user = computed(() => {
    if ("userId" in props.participant) {
        return api.session.getUserById(props.participant.userId);
    }
    return undefined;
});

const name = computed(() => {
    if (user.value) {
        return user.value?.username ?? "Player";
    } else if (props.participant.type === "bot") {
        return props.participant.name;
    }
    return "Player";
});

const countryCode = ref("");
const aiOptions: Ref<LuaOptionSection[]> = ref([]);
const aiOptionsOpen = ref(false);

const viewProfile = (player: Player) => {
    //
};

const kickPlayer = (player: Player) => {
    //
};

const messagePlayer = (player: Player) => {
    //
};

const blockPlayer = (player: Player) => {
    //
};

const addFriend = (player: Player) => {
    //
};

const reportPlayer = (player: Player) => {
    //
};

const kickAi = (bot: Bot) => {
    battle.removeParticipant(bot);
};

const configureAi = async (bot: Bot) => {
    await api.content.ai.processAis(battle.battleOptions.engineVersion);

    if (aiOptions.value.length === 0) {
        const ai = api.content.ai.getAis(battle.battleOptions.engineVersion)!.find((ai) => ai.shortName === bot.aiShortName)!;
        aiOptions.value = ai.options;
    }

    aiOptionsOpen.value = true;
};

const aiOptionsUpdated = (options: Record<string, unknown>) => {
    if (participant.value.type === "bot") {
        participant.value.aiOptions = options;
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

const getActions = (participant: Player | Bot | Spectator) => {
    if (participant.type === "bot") {
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
