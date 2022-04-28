<template>
    <ContextMenu :entries="getActions(participant)" :args="[participant]">
        <div class="participant">
            <Icon :icon="icon" :size="16" />
            <div v-if="countryCode" :class="`participant__flag fi fi-${countryCode}`" />
            <div class="participant__name">
                {{ name }}
            </div>
            <BotOptions v-if="participant.type === 'bot'" :bot="participant" />
        </div>
    </ContextMenu>
</template>

<script lang="ts" setup>
import ContextMenu, { ContextMenuEntry } from "@/components/common/ContextMenu.vue";
import Icon from "@/components/common/Icon.vue";
import { Bot, Player, Spectator } from "@/model/battle/participants";
import { computed, ref } from "vue";
import BotOptions from "@/components/battle/BotOptions.vue";

const props = defineProps<{
    participant: Player | Bot | Spectator
}>();

const battle = api.battle;

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

const icon = computed(() => props.participant.type === "bot" ? "robot" : "account");
const countryCode = ref("");

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

const configureAi = (bot: Bot) => {
    api.modals.open("configure-bot");
};

const playerActions: ContextMenuEntry[] = [
    { label: "View Profile", action: viewProfile },
    { label: "Message", action: messagePlayer },
    { label: "Kick", action: kickPlayer },
    { label: "Block", action: blockPlayer },
    { label: "Add Friend", action: addFriend },
    { label: "Report", action: reportPlayer },
];

const selfActions: ContextMenuEntry[] = [
    { label: "View Profile", action: viewProfile },
];

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