<template>
    <div class="battle-chat">
        <div class="messages">
            <div v-for="(message, i) in messages" :key="i" class="message">
                <div v-if="message.type === 'chat'" class="author">
                    {{ message.name }}
                </div>
                <div class="text">
                    {{ message.text }}
                </div>
            </div>
        </div>
        <Textbox v-model="myMessage" class="textbox fullwidth" enableSubmit enableHistory @submit="sendMessage" />
    </div>
</template>

<script lang="ts" setup>
import { onUnmounted, reactive, ref } from "vue";

import Textbox from "@/components/inputs/Textbox.vue";
import { BattleChatMessage } from "@/model/battle/battle-chat";

const messages: BattleChatMessage[] = reactive([]);
const myMessage = ref("");

const onAnnounce = api.comms.onResponse("s.lobby.announce").add((data) => {
    messages.push({
        type: "system",
        text: data.message,
    });
});

const sendMessage = (message: string) => {
    api.comms.request("c.lobby.message", { message }); // TODO: add to tachyon request schema
};

const onMessage = api.comms.onResponse("s.lobby.say").add((data) => {
    const user = api.session.getUserById(data.sender_id);
    if (!user) {
        console.warn("User not in session data", data.sender_id);
    }
    messages.push({
        type: "chat",
        name: user?.username ?? "Unknown",
        text: data.message,
    });
});

onUnmounted(() => {
    onMessage.destroy();
    onAnnounce.destroy();
});
</script>

<style lang="scss" scoped>
.battle-chat {
    display: flex;
    flex-direction: column;
    margin-top: auto;
    gap: 10px;
}
.messages {
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    height: 236px;
    padding: 15px;
    overflow-y: scroll;
    user-select: text;
    * {
        user-select: text;
    }
}
.message {
    display: flex;
    flex-direction: row;
}
.author {
    font-weight: 600;
    flex-direction: row;
    &:after {
        content: ":";
        margin-right: 5px;
    }
}
.textbox {
    :deep(input) {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
}
</style>
