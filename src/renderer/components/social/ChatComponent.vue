<template>
    <div
        class="chat-container"
        :class="{ expanded: isExpanded || battleStore.isLobbyOpened, translated: battleStore.isLobbyOpened }"
        @focusin="expandChat"
        @focusout="collapseChat"
    >
        <div class="chat-messages" :class="{ expanded: isExpanded || battleStore.isLobbyOpened }">
            <div v-for="(message, index) in messages" :key="index" :class="['chat-message', message.user]">
                <div class="message-content">
                    <span class="username">{{ message.user }}:</span>
                    <span class="text">{{ message.text }}</span>
                    <!-- <span class="timestamp">{{ message.time }}</span> -->
                </div>
            </div>
        </div>
        <div class="chat-input">
            <div class="target">To (Lobby):</div>
            <input ref="textBox" v-model="newMessage" @keydown.enter="sendMessage" placeholder="Type here to chat. Use '/' for commands." />
        </div>
    </div>
</template>
<script lang="ts" setup>
import { battleStore } from "@renderer/store/battle.store";
import { onKeyDown } from "@vueuse/core";
import { ref, useTemplateRef } from "vue";

interface Message {
    user: string;
    text: string;
    time: string;
}

const messages = ref<Message[]>([
    { user: "Player2", text: "Ready for the game?", time: "12:02" },
    { user: "Player1", text: "Hello, team!", time: "12:01" },
]);
const newMessage = ref("");
const isExpanded = ref(false);

const textBox = useTemplateRef<HTMLInputElement>("textBox");

const sendMessage = () => {
    if (newMessage.value.trim() !== "") {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        messages.value.unshift({
            user: "You",
            text: newMessage.value,
            time,
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

onKeyDown(
    "Enter",
    (e) => {
        if (isExpanded.value) {
            e.preventDefault();
            e.stopPropagation();
        } else {
            e.preventDefault();
            e.stopPropagation();
            textBox.value?.focus();
        }
    },
    { target: document }
);

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
.chat-container {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 20px;
    display: flex;
    flex-direction: column;
    height: 100px;
    transition: all 0.4s ease-in-out;
    width: 50%;
    max-width: 600px;
    z-index: 3;
    &.expanded {
        mask-image: none;
        height: 500px;
    }
    &.translated {
        transform: translateX(0%) translateY(-20%);
    }
}

.chat-container.expanded:after {
    @extend .fullsize;
    left: 0;
    top: 0;
    background-image: url("/src/renderer/assets/images/squares.png");
    background-size: auto;
    opacity: 0.3;
    mix-blend-mode: overlay; // doesn't support transition
    z-index: -1;
}

.chat-messages {
    mask-image: linear-gradient(to top, #000 0 50%, transparent);
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
    font-size: 15px;
}

.message-content {
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-items: baseline;
}

.username {
    font-weight: bold;
    color: #87ceeb;
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
    color: #87ceeb;
    font-weight: semibold;
}

.chat-input input {
    flex-grow: 1;
    padding: 0px 8px;
    color: #e0e0e0;
    font-size: 15px;
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
