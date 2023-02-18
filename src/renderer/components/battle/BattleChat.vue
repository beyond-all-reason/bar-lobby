<template>
    <div class="battle-chat">
        <div class="messages-container">
            <div
                v-tooltip="showHiddenMessages ? 'Hide junk messages' : 'Show junk messages'"
                class="toggle-hidden"
                :class="{ enabled: showHiddenMessages }"
                @click="showHiddenMessages = !showHiddenMessages"
            >
                <Icon :icon="eyeIcon" height="18" />
            </div>
            <div class="messages">
                <BattleMessage v-for="(message, i) in messages" v-show="!message.hide || showHiddenMessages" :key="i" :message="message" />
            </div>
        </div>
        <Textbox v-model="myMessage" class="fullwidth dark" @keyup.enter="sendMessage" />
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import eyeIcon from "@iconify-icons/mdi/eye";
import { ref } from "vue";

import BattleMessage from "@/components/battle/BattleMessage.vue";
import Textbox from "@/components/controls/Textbox.vue";

const messages = api.session.battleMessages;
const myMessage = ref("");
const showHiddenMessages = ref(false);

function sendMessage() {
    if (!myMessage.value) {
        return;
    }

    api.comms.request("c.lobby.message", {
        message: myMessage.value,
    });

    myMessage.value = "";
}
</script>

<style lang="scss" scoped>
.battle-chat {
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
    height: 100%;
}
.messages-container {
    display: flex;
    flex-direction: column-reverse;
    overflow-y: scroll;
    scroll-behavior: smooth;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: auto;
    height: 0;
}
.toggle-hidden {
    position: absolute;
    top: 0;
    right: 11px;
    padding: 5px;
    display: flex;
    opacity: 0.2;
    &:hover,
    &.enabled {
        opacity: 0.8;
    }
}
.messages {
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 5px;
}
</style>
