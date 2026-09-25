<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="chat-panel flex-col gap-lg flex-grow fullheight">
        <div class="message-container flex-col flex-grow">
            <div class="messages">
                <div v-if="messages.length === 0" class="no-messages">{{ t("lobby.navbar.messages.noMessages") }}</div>
                <div v-else class="flex-col gap-sm">
                    <div
                        v-for="(message, i) in messages"
                        :key="i"
                        v-in-view.once="() => (message.seen = true)"
                        :class="['message', { fromMe: message.source.userId === me.userId }]"
                        @contextmenu="onMessageRightClick($event, message)"
                    >
                        <span class="user-name">
                            {{ displayNames?.get(message.source.userId) ?? message.source.userId }}
                        </span>
                        <Markdown :source="message.message" />
                    </div>
                </div>
            </div>
        </div>

        <ContextMenu ref="menu" :model="actions" />
        <div class="chat-input flex-row gap-sm padding-md flex-bottom">
            <Textbox
                v-model="text"
                v-in-view="focusTextbox"
                class="reply"
                :disabled="!tachyonStore.isConnected"
                :placeholder="t('lobby.navbar.messages.message')"
                @keyup.enter.stop="sendMessage(text)"
            />
            <Button :disabled="!tachyonStore.isConnected" @click="sendMessage(text)">{{ t("lobby.navbar.messages.send") }}</Button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { chatStore, chat } from "@renderer/store/chat.store";
import { tachyonStore } from "@renderer/store/tachyon.store";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { LobbyId, PartyId, UserId } from "tachyon-protocol/types";
import { me } from "@renderer/store/me.store";
import { db } from "@renderer/store/db";
import { useTypedI18n } from "@renderer/i18n";
import Button from "@renderer/components/controls/Button.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import Markdown from "@renderer/components/misc/Markdown.vue";
import type { Message } from "@renderer/model/message";
import ContextMenu from "@renderer/components/common/ContextMenu.vue";
import { reportUserIconClass, useReportUser } from "@renderer/composables/useReportUser";

const props = defineProps<{
    type: "lobby" | "party";
    id: LobbyId | PartyId | undefined;
}>();

const { t } = useTypedI18n();

function focusTextbox(el: HTMLElement) {
    if (el.firstElementChild && el.firstElementChild instanceof HTMLElement) {
        el.firstElementChild.focus();
    }
}

const messages = computed(() => {
    if (!props.id) return [];
    const chats = props.type === "lobby" ? chatStore.lobbyChats : chatStore.partyChats;
    return chats.get(props.id) ?? [];
});

const displayNames = useDexieLiveQueryWithDeps(messages, async () => {
    const map = new Map<UserId, string>();
    await db.users.each(function (user) {
        map.set(user.userId, user.username);
    });
    return map;
});

const { openReportUser } = useReportUser();

const menu = ref<InstanceType<typeof ContextMenu>>();
const actions = ref<{ label: string; icon: string; command: () => void }[]>([]);

async function onMessageRightClick(event: MouseEvent, message: Message) {
    if (message.source.userId === me.userId) return;

    event.preventDefault();

    const user = await db.users.get(message.source.userId);
    if (!user) return;

    actions.value = [
        {
            label: t("lobby.components.user.reportUser.menuLabel"),
            icon: reportUserIconClass,
            command: () => openReportUser(user, message),
        },
    ];

    menu.value?.show(event);
}

const text = ref("");
const newMessage = ref("");

function sendMessage(messageText: string) {
    // Button's disabled prop only styles the control, it does not stop the click.
    if (!tachyonStore.isConnected) return;

    chat.requestSend({
        target: {
            type: props.type,
        },
        message: messageText,
    });
    newMessage.value = "";
    text.value = "";
}
</script>

<style lang="scss" scoped>
.chat-panel,
.message-container {
    min-height: 0;
}
.message-container {
    flex: 1 1 0;
}
.chat-input {
    flex: 0 0 auto;
}
.messages {
    display: flex;
    flex-direction: column-reverse;
    overflow-y: scroll;
    padding: 10px;
    flex: 1 1 auto;
    min-height: 0;
}
.no-messages {
    align-self: center;
    opacity: 0.5;
    font-style: italic;
    padding: 4px 8px;
}
.message {
    word-break: break-word;
    padding: 4px 8px;
    user-select: text;
    display: flex;
    flex-direction: row;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    align-self: flex-start;
    &.fromMe {
        align-self: flex-end;
        background: rgba(240, 240, 240, 0.247);
    }
}
.user-name {
    margin-right: 10px;
    padding: 4px 8px;
    overflow-wrap: normal;
    word-break: normal;
    font-weight: bold;
}
.reply-container {
    padding: 10px;
    padding-right: 20px;
}
.reply {
    width: 100%;
}
</style>
