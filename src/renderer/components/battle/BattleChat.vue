<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="battle-chat">
        <div class="messages-container">
            <div
                v-tooltip="
                    showHiddenMessages
                        ? t('lobby.components.battle.battleChat.hideJunkMessages')
                        : t('lobby.components.battle.battleChat.showJunkMessages')
                "
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
        <AutoSuggest
            v-model="myMessage"
            :options="optionList"
            class="fullwidth dark"
            @keyup.enter="sendMessage"
            @update:model-value="(value) => (myMessage = value)"
            @update-selection="(newSelection) => (autoSuggestionSelection = newSelection)"
        />
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import eyeIcon from "@iconify-icons/mdi/eye";
import type { Ref } from "vue";
import { onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useTypedI18n } from "@renderer/i18n";

import { Command, getAutoSuggestions, serverCommandList } from "@renderer/api/commands";
import BattleMessage from "@renderer/components/battle/BattleMessage.vue";
import AutoSuggest from "@renderer/components/controls/AutoSuggest.vue";
import AutoSuggestionOption from "@renderer/utils/auto-suggestion-option";
import { Message } from "@renderer/model/messages";

const { t } = useTypedI18n();

const optionList: Ref<AutoSuggestionOption[]> = ref([]);
const commandList = reactive<Command[]>(structuredClone(serverCommandList));
const messages: Message[] = [];
const myMessage = ref("");
const showHiddenMessages = ref(false);
const autoSuggestionSelection: Ref<string | null> = ref(null);

function sendMessage() {
    if (!myMessage.value) {
        return;
    }

    // If an autosuggestion is currently keyboard selected: pressing enter should autocomplete the suggestion
    if (autoSuggestionSelection.value != null) {
        myMessage.value = autoSuggestionSelection.value;
    }

    // api.comms.request("c.lobby.message", {
    //     message: myMessage.value,
    // });

    myMessage.value = "";
}

watch(
    commandList,
    (newCommandList) => {
        optionList.value = getAutoSuggestions(newCommandList);
    },
    { deep: true }
);

// const commandListener = api.comms.onResponse("s.communication.received_direct_message").add(async (data) => {
//     const { message } = data;
//     // Check if the message is a command
//     if (!message.startsWith("!") && !message.startsWith("$")) return;
//     const cmd = message.split("-")[0].split(" ")[0];
//     const cmdDescription = message.slice(cmd.length + 1).replace("-", " ");
//     if (cmdDescription && !cmdDescription.includes("*")) {
//         commandList.push({ cmd, cmdDescription });
//     }
// });

onMounted(() => {
    // api.comms.request("c.communication.send_direct_message", {
    //     recipient_id: 3137,
    //     message: `!helpall`,
    // });
});

onUnmounted(() => {
    // commandListener.destroy();
});
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
    will-change: scroll-position;
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
