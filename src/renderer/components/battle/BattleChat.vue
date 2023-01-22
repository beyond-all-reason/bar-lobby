<template>
    <div class="battle-chat">
        <div ref="messagesEl" class="messages">
            <div>
                <div v-for="(message, i) in messages" :key="i" class="message" :class="{ system: message.type === 'system' }">
                    <div v-if="message.type === 'chat'" class="author">
                        {{ message.name }}
                    </div>
                    <div class="text">
                        {{ message.text }}
                    </div>
                </div>
            </div>
        </div>
        <Textbox v-model="myMessage" class="battle-chat__textbox" @keyup.enter="sendMessage" />
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Textbox from "@/components/controls/Textbox.vue";
import { AbstractBattle } from "@/model/battle/abstract-battle";

const props = defineProps<{
    battle: AbstractBattle;
}>();

const messages = api.session.battleMessages;
const myMessage = ref("");
const messagesEl = ref(null as HTMLElement | null);

const sendMessage = () => {
    if (!myMessage.value) {
        return;
    }

    api.comms.request("c.lobby.message", {
        message: myMessage.value,
    });

    myMessage.value = "";
};
</script>

<style lang="scss" scoped>
.battle-chat {
    display: flex;
    flex-direction: column;
    margin-top: auto;
    gap: 10px;
    &__textbox {
        width: 100%;
    }
}
.messages {
    display: flex;
    flex-direction: column-reverse;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    height: 236px;
    padding: 15px;
    overflow-y: scroll;
    scroll-behavior: smooth;
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
.text {
    width: 100%;
    word-break: break-word;
    .system & {
        color: rgb(82, 215, 255);
        font-weight: 600;
    }
}
</style>
