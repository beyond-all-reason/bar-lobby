<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="friend">
        <div class="flex-row gap-md flex-center-items">
            <Flag :countryCode="user.countryCode" class="flag" />
            <div class="username">{{ user.username }}</div>
            <div :class="['online-dot', { offline: !user.isOnline }]">⬤</div>
        </div>
        <div class="flex-row gap-sm">
            <template v-if="type === 'outgoing_request'">
                <Button v-tooltip.left="t('lobby.navbar.tooltips.cancelRequest')" class="slim red square" @click="cancelRequest">
                    <Icon :icon="closeThick" />
                </Button>
            </template>

            <template v-else-if="type === 'incoming_request'">
                <Button v-tooltip.left="t('lobby.navbar.tooltips.rejectRequest')" class="slim red square" @click="rejectRequest">
                    <Icon :icon="closeThick" />
                </Button>
                <Button v-tooltip.left="t('lobby.navbar.tooltips.acceptRequest')" class="slim green square" @click="acceptRequest">
                    <Icon :icon="checkThick" />
                </Button>
            </template>

            <template v-else>
                <Button v-tooltip.left="t('lobby.navbar.tooltips.viewProfile')" class="slim square" @click="viewProfile">
                    <Icon :icon="account" />
                </Button>
                <Button
                    v-if="user.isOnline"
                    v-tooltip.left="t('lobby.navbar.tooltips.sendMessage')"
                    v-click-away:messages="() => {}"
                    class="slim square"
                    @click="sendMessage"
                >
                    <Icon :icon="messageReplyText" />
                </Button>
                <Button
                    v-if="user.isOnline && user.battleStatus.battleId"
                    v-tooltip.left="t('lobby.navbar.tooltips.joinBattle')"
                    class="slim square"
                    @click="joinBattle"
                >
                    <Icon :icon="accountArrowRight" />
                </Button>
                <Button
                    v-if="user.isOnline"
                    v-tooltip.left="t('lobby.navbar.tooltips.inviteToParty')"
                    class="slim square"
                    @click="inviteToParty"
                >
                    <Icon :icon="accountMultiplePlus" />
                </Button>
                <Button v-tooltip.left="t('lobby.navbar.tooltips.removeFriend')" class="slim red square" @click="removeFriend">
                    <Icon :icon="deleteIcon" />
                </Button>
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import account from "@iconify-icons/mdi/account";
import accountArrowRight from "@iconify-icons/mdi/account-arrow-right";
import accountMultiplePlus from "@iconify-icons/mdi/account-multiple-plus";
import checkThick from "@iconify-icons/mdi/check-thick";
import closeThick from "@iconify-icons/mdi/close-thick";
import deleteIcon from "@iconify-icons/mdi/delete";
import messageReplyText from "@iconify-icons/mdi/message-reply-text";
import { computed, inject, Ref } from "vue";

import Button from "@renderer/components/controls/Button.vue";
import Flag from "@renderer/components/misc/Flag.vue";
import { useRouter } from "vue-router";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const router = useRouter();

const props = defineProps<{
    userId: number;
    type: "outgoing_request" | "incoming_request" | "friend";
}>();

// TODO fetch from store of users
const user = computed(() => {
    return {
        userId: props.userId,
        username: "User Name",
        countryCode: "US",
        isOnline: true,
        battleStatus: {
            battleId: 0,
        },
    };
});

async function cancelRequest() {
    // await api.comms.request("c.user.rescind_friend_request", {
    //     user_id: props.user.userId,
    // });
    // api.session.onlineUser.incomingFriendRequestUserIds.delete(props.user.userId);
    // api.session.onlineUser.outgoingFriendRequestUserIds.delete(props.user.userId);
}

async function acceptRequest() {
    // await api.comms.request("c.user.accept_friend_request", {
    //     user_id: props.user.userId,
    // });
    // api.session.onlineUser.incomingFriendRequestUserIds.delete(props.user.userId);
    // api.session.onlineUser.outgoingFriendRequestUserIds.delete(props.user.userId);
    // api.session.onlineUser.friendUserIds.add(props.user.userId);
}

async function rejectRequest() {
    // await api.comms.request("c.user.reject_friend_request", {
    //     user_id: props.user.userId,
    // });
    // api.session.onlineUser.incomingFriendRequestUserIds.delete(props.user.userId);
    // api.session.onlineUser.outgoingFriendRequestUserIds.delete(props.user.userId);
}

async function viewProfile() {
    await router.push(`/profile/${props.userId}`);
}

const toggleMessages = inject<Ref<((open?: boolean, userId?: number) => void) | undefined>>("toggleMessages")!;
function sendMessage() {
    // if (!api.session.directMessages.has(props.user.userId)) {
    //     api.session.directMessages.set(props.user.userId, []);
    // }
    if (toggleMessages.value) {
        toggleMessages.value(true, props.userId);
    }
}

async function joinBattle() {
    // const battleIdToJoin = props.user.battleStatus.battleId;
    // await api.session.updateBattleList();
    // if (!battleIdToJoin) {
    //     console.warn("Joining battle but battle is null");
    //     return;
    // }
    // let battle = api.session.battles.get(battleIdToJoin);
    // if (!battle) {
    //     console.warn(`Battle with id ${battleIdToJoin} not found, hence can not join.`);
    //     return;
    // }
    // await attemptJoinBattle(battle);
}

async function inviteToParty() {
    // TODO
}

async function removeFriend() {
    // await api.comms.request("c.user.remove_friend", {
    //     user_id: props.user.userId,
    // });
}
</script>

<style lang="scss" scoped>
.friend {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.3);
    padding: 5px 8px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.square {
    :deep(.p-button) {
        padding: 2px;
        font-size: 17px;
    }
}

.online-dot {
    font-size: 12px;
    color: rgb(121, 226, 0);
    &.offline {
        color: rgb(216, 46, 46);
    }
}
</style>
