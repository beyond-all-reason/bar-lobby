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
                        <InputNumber
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

                    <Accordion
                        v-if="outgoingFriendRequests.length || incomingFriendRequests.length"
                        :activeIndex="accordianActiveIndexes"
                        multiple
                    >
                        <AccordionTab v-if="outgoingFriendRequests.length" header="Outgoing Friend Requests">
                            <div class="scroll-container">
                                <div class="user-list">
                                    <div class="scroll-container gap-sm padding-right-sm">
                                        <Friend
                                            v-for="(user, i) in outgoingFriendRequests"
                                            :key="`outgoingFriendRequest${i}`"
                                            :user="user"
                                            :type="'outgoing_request'"
                                        />
                                    </div>
                                </div>
                            </div>
                        </AccordionTab>
                        <AccordionTab v-if="incomingFriendRequests.length" header="Incoming Friend Requests">
                            <div class="user-list">
                                <div class="scroll-container gap-sm padding-right-sm">
                                    <Friend
                                        v-for="(user, i) in incomingFriendRequests"
                                        :key="`incomingFriendRequest${i}`"
                                        :user="user"
                                        :type="'incoming_request'"
                                    />
                                </div>
                            </div>
                        </AccordionTab>
                    </Accordion>

                    <div class="user-list">
                        <div class="scroll-container gap-sm padding-right-sm">
                            <Friend v-for="(user, i) in onlineFriends" :key="`onlineFriend${i}`" :user="user" :type="'friend'" />
                            <Friend v-for="(user, i) in offlineFriends" :key="`offlineFriend${i}`" :user="user" :type="'friend'" />
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
import InputNumber from "primevue/inputnumber";
import { InputNumberBlurEvent } from "primevue/inputnumber";
import TabPanel from "primevue/tabpanel";
import { computed, inject, Ref, ref, watch } from "vue";

import Accordion from "@/components/common/Accordion.vue";
import TabView from "@/components/common/TabView.vue";
import Button from "@/components/controls/Button.vue";
import Friend from "@/components/navbar/Friend.vue";
import PopOutPanel from "@/components/navbar/PopOutPanel.vue";

const props = defineProps<{
    modelValue: boolean;
}>();

const emits = defineEmits<{
    (event: "update:modelValue", open: boolean): void;
}>();

const activeIndex = ref(0);
const accordianActiveIndexes = ref([0, 1, 2]);
const friendId = ref();
let addFriendDisabled = ref(true);
const onlineFriends = computed(() => api.session.friends.value.filter((user) => user.isOnline));
const offlineFriends = computed(() => api.session.friends.value.filter((user) => !user.isOnline));
const outgoingFriendRequests = api.session.outgoingFriendRequests;
const incomingFriendRequests = api.session.incomingFriendRequests;
const myUserId = computed(() => api.session.onlineUser.userId);

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

async function addFriend() {
    api.comms.request("c.user.add_friend", {
        user_id: friendId.value,
    });

    const { users } = await api.comms.request("c.user.list_users_from_ids", {
        id_list: [friendId.value],
    });

    if (users.length) {
        api.session.onlineUser.incomingFriendRequestUserIds.add(friendId.value);
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
}
:deep(.FriendId) {
    flex-grow: 1;
    .p-inputnumber {
        width: 100px;
    }
    .p-inputtext {
        border: 1px solid rgba(255, 255, 255, 0.1);
        background-color: rgba(255, 255, 255, 0.2);
    }
}
</style>
