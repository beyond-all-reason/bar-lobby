<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <PopOutPanel :open="modelValue" class="flex-col flex-grow fullheight">
        <TabView v-model:activeIndex="activeIndex" class="flex-col flex-grow fullheight">
            <TabPanel :header="t('lobby.navbar.friends.title')">
                <div class="flex-col gap-lg flex-grow fullheight">
                    <div class="flex-row gap-md">
                        <div>
                            {{ t("lobby.navbar.friends.yourUserId") }} <strong>{{ myUserId }}</strong>
                        </div>
                        <Button class="slim" @click="copyUserId">{{ t("lobby.navbar.friends.copy") }}</Button>
                    </div>

                    <div class="flex-row gap-md">
                        <Number
                            id="friendId"
                            v-model="friendId"
                            type="number"
                            class="FriendId"
                            :allowEmpty="true"
                            :min="1"
                            :useGrouping="false"
                            :placeholder="t('lobby.navbar.friends.friendId')"
                            @input="handleFriendIdInput"
                        />
                        <Button class="blue" :disabled="addFriendDisabled" @click="addFriend">{{
                            t("lobby.navbar.friends.addFriend")
                        }}</Button>
                    </div>

                    <div class="flex-col fullheight">
                        <div class="scroll-container gap-md padding-right-sm">
                            <Accordion
                                v-if="me.outgoingFriendRequestUserIds.size || me.incomingFriendRequestUserIds.size"
                                :activeIndex="accordianActiveIndexes"
                                multiple
                            >
                                <AccordionTab
                                    v-if="me.outgoingFriendRequestUserIds.size"
                                    :header="t('lobby.navbar.friends.outgoingRequests')"
                                >
                                    <div class="user-list">
                                        <Friend
                                            v-for="userId in Array.from(me.outgoingFriendRequestUserIds)"
                                            :key="`outgoingFriendRequest${userId}`"
                                            :userId="userId"
                                            :type="'outgoing_request'"
                                        />
                                    </div>
                                </AccordionTab>
                                <AccordionTab
                                    v-if="me.incomingFriendRequestUserIds.size"
                                    :header="t('lobby.navbar.friends.incomingRequests')"
                                >
                                    <div class="user-list">
                                        <Friend
                                            v-for="userId in Array.from(me.incomingFriendRequestUserIds)"
                                            :key="`incomingFriendRequest${userId}`"
                                            :userId="userId"
                                            :type="'incoming_request'"
                                        />
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <div class="user-list">
                                <Friend
                                    v-for="userId in sortedFriends"
                                    :key="`friend${userId}`"
                                    :userId="userId"
                                    :type="'friend'"
                                    @statusChange="handleStatusChange"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </TabPanel>
            <TabPanel :header="t('lobby.navbar.friends.blocked')"> TODO </TabPanel>
        </TabView>
    </PopOutPanel>
</template>

<script lang="ts" setup>
/**
 * TODO:
 * friend shows: ingame status (playing 4v4 on DSD / watching 4v4 on DSD / waiting for game to begin / watch)
 * invite to battle button
 */

import AccordionTab from "primevue/accordiontab";
import TabPanel from "primevue/tabpanel";
import { computed, inject, ref, watch } from "vue";

import Accordion from "@renderer/components/common/Accordion.vue";
import TabView from "@renderer/components/common/TabView.vue";
import Button from "@renderer/components/controls/Button.vue";
import Number from "@renderer/components/controls/Number.vue";
import Friend from "@renderer/components/navbar/Friend.vue";
import PopOutPanel from "@renderer/components/navbar/PopOutPanel.vue";
import { me, friends } from "@renderer/store/me.store";
import { useTypedI18n } from "@renderer/i18n";
import { notificationsApi } from "@renderer/api/notifications";
import type { Ref } from "vue";

const { t } = useTypedI18n();

const props = defineProps<{
    modelValue: boolean;
}>();

const emits = defineEmits<{
    (event: "update:modelValue", open: boolean): void;
}>();

const activeIndex = ref(0);
const accordianActiveIndexes = ref([0, 1, 2]);
const friendId = ref<number>();
const addFriendDisabled = ref(true);
// Track online/offline status for sorting
const onlineUsers = ref(new Set<number>());

// Handle status changes from Friend components
function handleStatusChange({ userId, status }: { userId: number; status: string }) {
    if (status !== "offline") {
        onlineUsers.value.add(userId);
    } else {
        onlineUsers.value.delete(userId);
    }
}

// Sorted friends with online users at the top
const sortedFriends = computed(() => {
    const friendUserIds = Array.from(me.friendUserIds);

    return friendUserIds.sort((a, b) => {
        const aOnline = onlineUsers.value.has(a);
        const bOnline = onlineUsers.value.has(b);
        if (aOnline === bOnline) return 0;
        return aOnline ? -1 : 1; // Online users first
    });
});

const myUserId = computed(() => me.userId);

const toggleMessages = inject<Ref<(open?: boolean, userId?: number) => void>>("toggleMessages")!;
const toggleFriends = inject<Ref<(open?: boolean) => void>>("toggleFriends")!;
const toggleDownloads = inject<Ref<(open?: boolean) => void>>("toggleDownloads")!;

function handleFriendIdInput(event: { value: number | null }) {
    if (event && event.value !== null) {
        addFriendDisabled.value = false;
    } else {
        addFriendDisabled.value = true;
    }
}

toggleFriends.value = (open?: boolean) => {
    if (open) {
        toggleMessages.value(false);
        toggleDownloads.value(false);
    }

    emits("update:modelValue", open ?? !props.modelValue);
};

watch(
    () => props.modelValue,
    (open: boolean) => {
        if (open) {
            activeIndex.value = 0;
        }
    }
);

function copyUserId() {
    navigator.clipboard.writeText(myUserId.value.toString());
}

async function addFriend() {
    if (!friendId.value) return;

    const userIdToAdd = friendId.value.toString();

    friendId.value = undefined;
    addFriendDisabled.value = true;

    try {
        await friends.sendRequest(userIdToAdd);
    } catch (error) {
        console.error("Failed to send friend request:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        const errorMessageMap: Record<string, string> = {
            already_in_friendlist: "lobby.navbar.friends.notifications.errors.alreadyFriends",
            invalid_user: "lobby.navbar.friends.notifications.errors.invalidUser",
            outgoing_capacity_reached: "lobby.navbar.friends.notifications.errors.outgoingCapacityReached",
            incoming_capacity_reached: "lobby.navbar.friends.notifications.errors.incomingCapacityReached",
            internal_error: "lobby.navbar.friends.notifications.errors.internalError",
            unauthorized: "lobby.navbar.friends.notifications.errors.unauthorized",
            invalid_request: "lobby.navbar.friends.notifications.errors.invalidRequest",
            command_unimplemented: "lobby.navbar.friends.notifications.errors.commandUnimplemented",
        };

        // Check if the error message matches any known reason
        const matchedReason = Object.keys(errorMessageMap).find((reason) => errorMessage.includes(reason));

        const notificationText = matchedReason ? t(errorMessageMap[matchedReason]) : t("lobby.navbar.friends.notifications.errors.generic");

        notificationsApi.alert({
            text: notificationText,
            severity: "error",
        });
    }
}
</script>

<style lang="scss" scoped>
.user-list {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 5px;
}
:deep(.FriendId) {
    flex-grow: 1;
}
:deep(.p-tabview-panels) {
    height: 100%;
}
</style>
