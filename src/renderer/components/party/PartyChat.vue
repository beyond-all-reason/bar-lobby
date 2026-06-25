<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="flex-col gap-lg flex-grow fullheight">
        <div class="flex-col flex-grow fullheight">
            <div class="messages">
                <div class="flex-col gap-sm">
                    <div
                        v-for="(message, i) in chatStore.partyChat"
                        :key="i"
                        v-in-view.once="() => (message.seen = true)"
                        :class="['message', { fromMe: message.source.userId === me.userId }]"
                    >
                        <span class="user-name"> {{ displayNames?.get(message.source.userId) ?? message.source.userId }} </span>
                        <Markdown :source="message.message" />
                    </div>
                </div>
            </div>
        </div>
        <div class="flex-row gap-sm flex-bottom padding-md">
            <Textbox
                v-model="text"
                v-in-view="focusTextbox"
                class="reply"
                :placeholder="t('lobby.navbar.messages.message')"
                @keyup.enter.stop="sendPartyMessage(text)"
            />
            <Button @click="sendPartyMessage(text)">{{ t("lobby.navbar.messages.send") }}</Button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { chatStore, chat } from "@renderer/store/chat.store";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { User } from "@main/model/user";
import { UserId } from "tachyon-protocol/types";
import { me } from "@renderer/store/me.store";
import { partyStore } from "@renderer/store/party.store";
import { db } from "@renderer/store/db";
import { useTypedI18n } from "@renderer/i18n";
import Button from "@renderer/components/controls/Button.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import Markdown from "@renderer/components/misc/Markdown.vue";

const { t } = useTypedI18n();

function focusTextbox(el: HTMLElement) {
    if (el.firstElementChild && el.firstElementChild instanceof HTMLElement) {
        el.firstElementChild.focus();
    }
}
const displayNames = useDexieLiveQueryWithDeps(partyStore.activeParty?.members, async () => {
    const map = new Map<UserId, string>();
    await db.users
        .filter((user: User) => displayUsersFilter(user))
        .each(function (user) {
            map.set(user.userId, user.username);
        });
    return map;
});

const text = ref("");
const newMessage = ref("");

function sendPartyMessage(messageText: string) {
    chat.requestSend({
        target: {
            type: "party",
        },
        message: messageText,
    });
    newMessage.value = "";
    text.value = "";
}

function displayUsersFilter(user: User) {
    if (!user) return false;
    if (partyStore.activeParty?.members.find((member) => member.userId === user.userId)) return true;
    return false;
}
</script>

<style lang="scss" scoped>
.messages {
    display: flex;
    flex-direction: column-reverse;
    overflow-y: scroll;
    padding: 10px;
    // flex: 1 1 auto;
    height: 600px;
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
