<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <PopOutPanel :open="modelValue">
        <TabView v-model:activeIndex="activeTabIndex" class="messages-tabview">
            <TabPanel v-for="[userId, messages] in chatStore.userChats" :key="userId">
                <template #header>
                    <div class="tab-header">
                        <div>
                            {{ displayNames?.get(userId) }}
                            <Icon :icon="messageProcessing" :class="hasUnseenMessage(messages) ? 'icon-alert' : ''" />
                        </div>
                        <div class="flex-row close" @click="closeUserTab(userId)">
                            <Icon :icon="closeThick" />
                        </div>
                    </div>
                </template>
                <div class="messages">
                    <div class="flex-col gap-sm">
                        <div
                            v-for="(message, i) in messages"
                            :key="i"
                            v-in-view.once="() => (message.seen = true)"
                            :class="['message', { fromMe: message.source.userId === me.userId }]"
                        >
                            <Markdown :source="message.message" />
                        </div>
                    </div>
                </div>
                <div class="flex-row gap-sm flex-bottom padding-md">
                    <Textbox
                        v-model="text"
                        v-in-view="focusTextbox"
                        class="reply"
                        :placeholder="t('lobby.navbar.messages.message')"
                        @keyup.enter.stop="sendDirectMessage(userId, text)"
                    />
                    <Button @click="sendDirectMessage(userId, text)">{{ t("lobby.navbar.messages.send") }}</Button>
                </div>
            </TabPanel>
            <TabPanel>
                <template #header>
                    <Icon :icon="chatPlus" />
                </template>
                <div class="flex-col flex-grow padding-md">
                    <Textbox
                        v-model="newMessageUserId"
                        v-in-view="focusTextbox"
                        class="fullwidth"
                        :label="t('lobby.navbar.messages.userID')"
                        :placeholder="t('lobby.navbar.messages.userIDPlaceholder')"
                    />
                    <div class="flex-row gap-sm flex-bottom">
                        <Textbox
                            v-model="newMessage"
                            class="reply"
                            :placeholder="t('lobby.navbar.messages.message')"
                            @keyup.enter.stop="sendDirectMessage(newMessageUserId, newMessage)"
                        />
                        <Button @click="sendDirectMessage(newMessageUserId, newMessage)">{{ t("lobby.navbar.messages.send") }}</Button>
                    </div>
                </div>
            </TabPanel>
        </TabView>
    </PopOutPanel>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import chatPlus from "@iconify-icons/mdi/chat-plus";
import closeThick from "@iconify-icons/mdi/close-thick";
import messageProcessing from "@iconify-icons/mdi/message-processing";
import TabPanel from "primevue/tabpanel";
import { inject, Ref, ref } from "vue";
import TabView from "@renderer/components/common/TabView.vue";
import Button from "@renderer/components/controls/Button.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import Markdown from "@renderer/components/misc/Markdown.vue";
import PopOutPanel from "@renderer/components/navbar/PopOutPanel.vue";
import { useTypedI18n } from "@renderer/i18n";
import { chatStore, chat } from "@renderer/store/chat.store";
import { UserId } from "tachyon-protocol/types";
import { User } from "@main/model/user";
import { me } from "@renderer/store/me.store";
import { Message } from "@renderer/model/message";
import { db } from "@renderer/store/db";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";

const { t } = useTypedI18n();

const props = defineProps<{
    modelValue: boolean;
}>();

const emits = defineEmits<{
    (event: "update:modelValue", open: boolean): void;
}>();

const displayNames = useDexieLiveQueryWithDeps(chatStore.userChats, async () => {
    const map = new Map<UserId, string>();
    await db.users
        .filter((user: User) => displayUsersFilter(user))
        .each(function (user) {
            map.set(user.userId, user.username);
        });
    return map;
});

function displayUsersFilter(user: User) {
    if (!user) return false;
    if (chatStore.userChats.get(user.userId)) return true;
    else return false;
}

const text = ref("");
const newMessage = ref("");
const newMessageUserId = ref("");
const activeTabIndex = ref(0);

const toggleMessages = inject<Ref<(open?: boolean, userId?: string) => void>>("toggleMessages")!;
const toggleFriends = inject<Ref<(open?: boolean) => void>>("toggleFriends")!;
const toggleDownloads = inject<Ref<(open?: boolean) => void>>("toggleDownloads")!;

toggleMessages.value = (open?: boolean, userIdToActivate?: string) => {
    if (open) {
        toggleFriends.value(false);
        toggleDownloads.value(false);
    }
    emits("update:modelValue", open ?? !props.modelValue);
    if (userIdToActivate) {
        activeTabIndex.value = [...chatStore.userChats.keys()].indexOf(userIdToActivate);
    }
};

function focusTextbox(el: HTMLElement) {
    if (el.firstElementChild && el.firstElementChild instanceof HTMLElement) {
        el.firstElementChild.focus();
    }
}

function sendDirectMessage(destinationUserId: string, messageText: string) {
    chat.requestSend({
        target: {
            type: "player",
            userId: destinationUserId,
        },
        message: messageText,
    });
    newMessageUserId.value = "";
    newMessage.value = "";
    text.value = "";
}

function closeUserTab(userId: string) {
    chat.clearUserChat(userId);
}

function hasUnseenMessage(messages: Message[]) {
    return messages.at(-1)?.seen === false;
}
</script>

<style lang="scss" scoped>
.messages-tabview,
:deep(.p-tabview-panels),
:deep(.p-tabview-panel) {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    padding: 0 !important;
}

:deep(.p-tabview-header) {
    flex-shrink: 0;
}

:deep(.p-tabview-nav) {
    overflow-x: auto;
}

:deep(.p-tabview-header-action) {
    overflow: unset;
}
.messages {
    display: flex;
    flex-direction: column-reverse;
    overflow-y: scroll;
    padding: 10px;
    flex: 1 1 auto;
    height: 0;
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
.reply-container {
    padding: 10px;
    padding-right: 20px;
}
.reply {
    width: 100%;
}
.close {
    position: absolute;
    height: 100%;
    top: 0;
    right: 0;
    display: flex;
    align-items: center;
    background: none;
    border: none;
    opacity: 0.5;
    padding: 10px;
    &:hover {
        opacity: 1;
    }
}
.tab-header {
    min-width: 100px;
    align-items: center;
}
.icon-alert {
    color: red;
}
</style>
