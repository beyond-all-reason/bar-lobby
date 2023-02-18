<template>
    <div class="message" :class="[{ 'from-host': fromHost }, message.type]">
        <div v-if="user && !user.isBot" class="user">
            <Flag :countryCode="user.countryCode" style="width: 16px" />
            <div>{{ user.username }}</div>
        </div>
        <div class="text">
            {{ message.text }}
        </div>
    </div>
</template>

<script lang="ts" setup>
import Flag from "@/components/misc/Flag.vue";
import { Message } from "@/model/messages";

const props = defineProps<{
    message: Message;
}>();

const user = api.session.getUserById(props.message.senderUserId);
const fromHost = api.session.onlineBattle.value?.founder.value.userId === props.message.senderUserId;
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
.text {
    width: 100%;
    word-break: break-word;
    padding: 4px 8px;
    user-select: text;
    .system & {
        color: rgb(82, 215, 255);
        font-weight: 600;
    }
}
</style>
