<template>
    <PopOutPanel :open="modelValue" class="flex-col flex-grow fullheight">
        <TabView v-model:activeIndex="activeIndex" class="flex-col flex-grow fullheight">
            <TabPanel header="Friends">
                <div class="flex-col gap-lg flex-grow fullheight">
                    <div class="flex-row gap-md">
                        <div>
                            Your User ID is <strong>{{ myUserId }}</strong>
                        </div>
                        <Button class="slim" @click="copyUserId">Copy</Button>
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
                            placeholder="Friend ID"
                            @input="handleFriendIdInput"
                        />
                        <Button class="blue" :disabled="addFriendDisabled" @click="addFriend">Add Friend</Button>
                    </div>

                    <div class="flex-col fullheight">
                        <div class="scroll-container gap-md padding-right-sm">
                            <Accordion
                                v-if="outgoingFriendRequests.size || incomingFriendRequests.size"
                                :activeIndex="accordianActiveIndexes"
                                multiple
                            >
                                <AccordionTab v-if="outgoingFriendRequests.size" header="Outgoing Friend Requests">
                                    <div class="user-list">
                                        <Friend
                                            v-for="userId in outgoingFriendRequests"
                                            :key="`outgoingFriendRequest${userId}`"
                                            :userId="userId"
                                            :type="'outgoing_request'"
                                        />
                                    </div>
                                </AccordionTab>
                                <AccordionTab v-if="incomingFriendRequests.size" header="Incoming Friend Requests">
                                    <div class="user-list">
                                        <Friend
                                            v-for="userId in incomingFriendRequests"
                                            :key="`incomingFriendRequest${userId}`"
                                            :userId="userId"
                                            :type="'incoming_request'"
                                        />
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <div class="user-list">
                                <Friend v-for="userId in onlineFriends" :key="`onlineFriend${userId}`" :userId="userId" :type="'friend'" />
                                <Friend
                                    v-for="userId in offlineFriends"
                                    :key="`offlineFriend${userId}`"
                                    :userId="userId"
                                    :type="'friend'"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </TabPanel>
            <TabPanel header="Blocked"> TODO </TabPanel>
        </TabView>
    </PopOutPanel>
</template>

<script lang="ts" setup>
/**
 * TODO:
 * list friends (online above, offline below)
 * friend shows: username, flag, ingame status (playing 4v4 on DSD / watching 4v4 on DSD / waiting for game to begin / watch)
 * add friend button
 * remove friend button
 * invite to battle button
 */

import AccordionTab from "primevue/accordiontab";
import { InputNumberBlurEvent } from "primevue/inputnumber";
import TabPanel from "primevue/tabpanel";
import { computed, inject, Ref, ref, watch } from "vue";

import Accordion from "@renderer/components/common/Accordion.vue";
import TabView from "@renderer/components/common/TabView.vue";
import Button from "@renderer/components/controls/Button.vue";
import Number from "@renderer/components/controls/Number.vue";
import Friend from "@renderer/components/navbar/Friend.vue";
import PopOutPanel from "@renderer/components/navbar/PopOutPanel.vue";
import { me } from "@renderer/store/me.store";

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
const onlineFriends = computed<number[]>(() => []);
const offlineFriends = computed<number[]>(() => []);
const outgoingFriendRequests = me.outgoingFriendRequestUserIds;
const incomingFriendRequests = me.incomingFriendRequestUserIds;
const myUserId = computed(() => me.userId);

const toggleMessages = inject<Ref<(open?: boolean, userId?: number) => void>>("toggleMessages")!;
const toggleFriends = inject<Ref<(open?: boolean) => void>>("toggleFriends")!;
const toggleDownloads = inject<Ref<(open?: boolean) => void>>("toggleDownloads")!;

function handleFriendIdInput(event: InputNumberBlurEvent) {
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

async function addFriend() {}
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
