<template>
    <div
        class="chat-container"
        :class="{ expanded: isExpanded || battleStore.isLobbyOpened, translated: battleStore.isLobbyOpened }"
        @focusin="expandChat"
        @focusout="collapseChat"
    >
        <div class="tabs">
            <div class="tab" v-for="chatRoom in chatStore.chatRooms" :key="chatRoom.id">
                <Button :class="{ active: chatStore.selectedChatRoom.id === chatRoom.id }" @click="clickTab(chatRoom)">
                    <span class="unread-messages-dot" :class="{ active: chatRoom.unreadMessages > 0 }">⬤</span>
                    {{ chatRoom.name }}
                    <span class="close-button" v-if="chatRoom.closeable" @click="(e) => closeChatRoom(e, chatRoom)">
                        <Icon :icon="closeThick" />
                    </span>
                </Button>
            </div>
        </div>
        <div class="chat-messages" :class="{ expanded: isExpanded || battleStore.isLobbyOpened }">
            <div
                v-for="(message, index) in chatStore.selectedChatRoom.messages.toReversed()"
                :key="index"
                :class="['chat-message', message.userId]"
            >
                <div class="message-content">
                    <span class="username" :style="{ color: chatStore.selectedChatRoom.color }">{{ message.userName }}:</span>
                    <span class="text">{{ message.text }}</span>
                    <span class="failed" v-if="message.failed">failed to deliver</span>
                    <!-- <span class="timestamp">{{ message.timestamp }}</span> -->
                </div>
            </div>
        </div>
        <div class="chat-input">
            <div class="target" :style="{ color: chatStore.selectedChatRoom.color }">To ({{ chatStore.selectedChatRoom.name }}):</div>
            <input ref="textBox" v-model="newMessage" @keydown.enter="sendMessage" placeholder="Type here to chat. Use '/' for commands." />
        </div>
    </div>
</template>
<script lang="ts" setup>
import { Icon } from "@iconify/vue/dist/iconify.js";
import Button from "@renderer/components/controls/Button.vue";
import { battleStore } from "@renderer/store/battle.store";
import { chatActions, ChatRoom, chatStore } from "@renderer/store/chat.store";
import { me } from "@renderer/store/me.store";
import { onKeyDown, useMagicKeys } from "@vueuse/core";
import { ref, useTemplateRef, watch } from "vue";
import closeThick from "@iconify-icons/mdi/close-thick";

const keys = useMagicKeys();
const shiftEnter = keys["Shift+Enter"];

const newMessage = ref("");
const isExpanded = ref(false);
const textBox = useTemplateRef<HTMLInputElement>("textBox");

const sendMessage = () => {
    if (newMessage.value.trim() !== "") {
        chatActions.sendMessage({
            userId: me.userId,
            userName: me.username,
            text: newMessage.value,
            timestamp: Date.now(),
        });
        newMessage.value = "";
    }
};

const expandChat = () => {
    isExpanded.value = true;
};

const collapseChat = () => {
    isExpanded.value = false;
};

const clickTab = (chatRoom: ChatRoom) => {
    chatActions.selectChatRoom(chatRoom.id);
    textBox.value?.focus();
};

const closeChatRoom = (e: Event, chatRoom: ChatRoom) => {
    e.stopPropagation();
    chatActions.closeChatRoom(chatRoom.id);
    textBox.value?.focus();
};

watch(shiftEnter, () => {
    if (!isExpanded.value) {
        textBox.value?.focus();
    }
});

onKeyDown(
    "Escape",
    (e) => {
        if (isExpanded.value) {
            e.preventDefault();
            e.stopPropagation();
            textBox.value?.blur();
            isExpanded.value = false;
        }
    },
    { target: document }
);
</script>

<style lang="scss" scoped>
.tabs {
    transition: all 0.4s ease-in-out;
    flex-direction: row;
    background: black;
    width: 100%;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    font-size: 14px;
    .tab {
        padding-left: 8px;
        padding-top: 8px;
    }
    .button {
        background: rgb(0, 0, 0);
        border: none;
        color: rgba(255, 255, 255, 0.5);
        flex-grow: 0;
        :deep(> button) {
            padding: 0 20px;
        }
        &:hover,
        &.active {
            color: #fff;
            background: rgba(255, 255, 255, 0.05);
        }
    }
}

.unread-messages-dot {
    position: absolute;
    left: 8px;
    display: none;
    font-size: 8px;
    margin-right: 8px;
    color: rgb(226, 91, 91);
    &.active {
        display: inline;
    }
}

.close-button {
    position: absolute;
    z-index: 1;
    right: 4px;
    padding: 3px;
    cursor: pointer;
    line-height: 0;
    font-size: 8px;
    border-radius: 200px;
    &:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
}

.chat-container {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 20px;
    display: flex;
    flex-direction: column;
    height: 150px;
    transition: all 0.4s ease-in-out;
    width: 50%;
    max-width: 600px;
    z-index: 3;
    &.expanded {
        mask-image: none;
        height: 400px;
    }
    &.translated {
        left: 900px;
        transform: translate(20px, 0);
    }
}

.chat-container.expanded:after {
    @extend .fullsize;
    left: 0;
    top: 0;
    opacity: 0.3;
    mix-blend-mode: overlay; // doesn't support transition
    z-index: -1;
}

// tabs are fading out when chat is collapsed
.chat-container:not(.expanded) .tabs {
    opacity: 0;
}

.chat-messages {
    mask-image: linear-gradient(to top, #000 0 70%, transparent);
    flex-grow: 1;
    padding: 8px;
    display: flex;
    flex-direction: column-reverse;
    gap: 2px;
    overflow-y: scroll;
}

.chat-messages.expanded {
    mask-image: none;
    background-color: #000000d5;
}

.chat-message {
    font-size: 13px;
}

.message-content {
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-items: baseline;
}

.username {
    font-weight: bold;
}

.failed {
    color: rgba(226, 91, 91, 0.521);
    font-size: 8px;
    position: absolute;
    right: 20px;
}

.timestamp {
    font-size: 0.8em;
    color: #999;
}

.chat-input {
    display: flex;
    align-items: baseline;
    background-color: #000000;
    border: 1px solid #020202;
}

.chat-input .target {
    padding: 4px 8px;
    font-weight: bold;
    font-size: 13px;
}

.chat-input input {
    flex-grow: 1;
    padding: 0px 8px;
    color: #e0e0e0;
    font-size: 13px;
}

// .chat-input button {
//     padding: 4px 12px;
//     color: #e0e0e0;
//     background-color: #444;
//     border: 1px solid #555;
//     cursor: pointer;
// }

.chat-input button:hover {
    background-color: #555;
}
</style>
