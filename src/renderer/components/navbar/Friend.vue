<template>
    <div class="friend">
        <div class="flex-row gap-md">
            <Flag :countryCode="user.countryCode" class="flag" />
            <div class="username">{{ user.username }}</div>
        </div>
        <div class="flex-row gap-sm">
            <template v-if="type === 'outgoing_request'">
                <Button v-tooltip="`Cancel request`" class="slim red square" @click="cancelRequest">
                    <Icon :icon="closeThick" />
                </Button>
            </template>

            <template v-else-if="type === 'incoming_request'">
                <Button v-tooltip="`Reject request`" class="slim red square" @click="rejectRequest">
                    <Icon :icon="closeThick" />
                </Button>
                <Button v-tooltip="`Accept request`" class="slim green square" @click="acceptRequest">
                    <Icon :icon="checkThick" />
                </Button>
            </template>

            <template v-else>
                <Button v-tooltip="`View profile`" class="slim square" @click="viewProfile">
                    <Icon :icon="account" />
                </Button>
                <Button v-tooltip="`Send message`" class="slim square" @click="sendMessage">
                    <Icon :icon="messageReplyText" />
                </Button>
                <Button v-tooltip="`Join battle`" class="slim square" @click="joinBattle">
                    <Icon :icon="accountArrowRight" />
                </Button>
                <Button v-tooltip="`Invite to party`" class="slim square" @click="inviteToParty">
                    <Icon :icon="accountMultiplePlus" />
                </Button>
                <Button v-tooltip="`Remove friend`" class="slim red square" @click="removeFriend">
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

import Button from "@/components/controls/Button.vue";
import Flag from "@/components/misc/Flag.vue";
import { User } from "@/model/user";

const props = defineProps<{
    user: User;
    type: "outgoing_request" | "incoming_request" | "friend";
}>();

async function cancelRequest() {
    await api.comms.request("c.user.rescind_friend_request", {
        user_id: props.user.userId,
    });

    api.session.onlineUser.incomingFriendRequestUserIds.delete(props.user.userId);
    api.session.onlineUser.outgoingFriendRequestUserIds.delete(props.user.userId);
}

async function acceptRequest() {
    await api.comms.request("c.user.accept_friend_request", {
        user_id: props.user.userId,
    });

    api.session.onlineUser.incomingFriendRequestUserIds.delete(props.user.userId);
    api.session.onlineUser.outgoingFriendRequestUserIds.delete(props.user.userId);
    api.session.onlineUser.friendUserIds.add(props.user.userId);
}

async function rejectRequest() {
    await api.comms.request("c.user.reject_friend_request", {
        user_id: props.user.userId,
    });

    api.session.onlineUser.incomingFriendRequestUserIds.delete(props.user.userId);
    api.session.onlineUser.outgoingFriendRequestUserIds.delete(props.user.userId);
}

async function viewProfile() {
    api.router.push({
        path: `/profile/overview/${props.user.userId}`,
    });
}

async function sendMessage() {
    // TODO
}

async function joinBattle() {
    // TODO
}

async function inviteToParty() {
    // TODO
}

async function removeFriend() {
    // TODO
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
.flag {
}
.username {
    font-size: 18px;
    font-weight: 600;
}
.square {
    :deep(.p-button) {
        padding: 2px;
        font-size: 17px;
    }
}
</style>
