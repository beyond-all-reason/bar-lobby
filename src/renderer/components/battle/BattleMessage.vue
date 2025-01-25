<template>
    <div class="message" :class="[{ 'from-host': fromHost }, message.type]">
        <div v-if="user" class="user">
            <Flag :countryCode="user.countryCode" style="width: 16px" />
            <div>{{ user.username }}</div>
        </div>
        <Markdown :source="message.text" />
    </div>
</template>

<script lang="ts" setup>
import { User } from "@main/model/user";
import Flag from "@renderer/components/misc/Flag.vue";
import Markdown from "@renderer/components/misc/Markdown.vue";
import { Message } from "@renderer/model/messages";
import { me } from "@renderer/store/me.store";

defineProps<{
    message: Message;
}>();

const user: User = {
    battleRoomState: {},
    countryCode: "US",
    userId: "123",
    clanId: "123",
    username: "Test User",
    displayName: "Test User",
    partyId: "123",
    status: "lobby",
};

// const user = api.session.getUserById(props.message.senderUserId);
const fromHost = user.userId === me.userId;
</script>

<style lang="scss" scoped>
.message {
    display: flex;
    flex-direction: row;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    &.from-host {
        background: rgba(110, 186, 216, 0.4);
    }
    &.battle-announcement {
        background: rgba(119, 255, 180, 0.24);
    }
}
.user {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.05);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.4);
    font-weight: 500;
}
</style>
