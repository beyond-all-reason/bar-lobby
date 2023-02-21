<template>
    <PopOutPanel :open="modelValue">
        <TabView v-model:activeIndex="activeIndex">
            <TabPanel header="Friends">
                <div class="flex-col gap-lg container">
                    <div class="flex-row gap-md">
                        <div>
                            Your User ID is <strong>{{ myUserId }}</strong>
                        </div>
                        <Button class="slim" @click="copyUserId">Copy</Button>
                    </div>

                    <div class="flex-row gap-md">
                        <Textbox v-model="friendIdStr" type="number" class="txtFriendId" label="Friend ID" placeholder="12345" />
                        <Button class="blue" :disabled="!Boolean(friendIdStr)" @click="addFriend">Add Friend</Button>
                    </div>

                    <Accordion :activeIndex="accordianActiveIndexes" multiple>
                        <AccordionTab v-if="outgoingFriendRequests.length" header="Outgoing Friend Requests">
                            <div class="user-list">
                                <Friend
                                    v-for="(user, i) in outgoingFriendRequests"
                                    :key="`outgoingFriendRequest${i}`"
                                    :user="user"
                                    :type="'outgoing_request'"
                                />
                            </div>
                        </AccordionTab>
                        <AccordionTab v-if="incomingFriendRequests.length" header="Incoming Friend Requests">
                            <div class="user-list">
                                <Friend
                                    v-for="(user, i) in incomingFriendRequests"
                                    :key="`incomingFriendRequest${i}`"
                                    :user="user"
                                    :type="'incoming_request'"
                                />
                            </div>
                        </AccordionTab>
                        <AccordionTab v-if="onlineFriends.length" header="Online">
                            <div class="user-list">
                                <Friend v-for="(user, i) in offlineFriends" :key="`offlineFriends${i}`" :user="user" :type="'friend'" />
                            </div>
                        </AccordionTab>
                        <AccordionTab v-if="offlineFriends.length" header="Offline">
                            <div class="user-list">
                                <Friend v-for="(user, i) in offlineFriends" :key="`offlineFriends${i}`" :user="user" :type="'friend'" />
                            </div>
                        </AccordionTab>
                    </Accordion>
                </div>
            </TabPanel>
            <TabPanel header="Blocked">
                <div class="flex-col gap-md user-container">
                    <div class="user-list">TODO</div>
                </div>
            </TabPanel>
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
import TabPanel from "primevue/tabpanel";
import { computed, ref, watch } from "vue";

import Accordion from "@/components/common/Accordion.vue";
import TabView from "@/components/common/TabView.vue";
import Button from "@/components/controls/Button.vue";
import Textbox from "@/components/controls/Textbox.vue";
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
const friendIdStr = ref("");
const onlineFriends = computed(() => api.session.friends.value.filter((user) => user.isOnline));
const offlineFriends = computed(() => api.session.friends.value.filter((user) => !user.isOnline));
const outgoingFriendRequests = api.session.outgoingFriendRequests;
const incomingFriendRequests = api.session.incomingFriendRequests;
const myUserId = computed(() => api.session.onlineUser.userId);

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
    if (friendIdStr.value) {
        const friendId = parseInt(friendIdStr.value);

        api.comms.request("c.user.add_friend", {
            user_id: friendId,
        });

        const { users } = await api.comms.request("c.user.list_users_from_ids", {
            id_list: [friendId],
        });

        if (users.length) {
            api.session.onlineUser.incomingFriendRequestUserIds.add(friendId);
        }
    }
}
</script>

<style lang="scss" scoped>
.friends {
    position: fixed;
    right: 0;
    top: 70px;
    z-index: 2;
    min-width: 475px;
    max-width: 475px;
    min-height: 400px;
    max-height: 400px;
    transform: translateX(-9px);
    opacity: 1;
    transition: transform 200ms, opacity 200ms;
    background: rgba(0, 0, 0, 0.85);
    :deep(.content) {
        padding: 0;
    }
    &.hidden {
        transform: translateX(20px);
        opacity: 0;
        pointer-events: none;
    }
}
.user-container {
    overflow-y: scroll;
    padding-right: 5px;
}
.user-list {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 5px;
}
:deep(.txtFriendId) {
    flex-grow: 1;
    .p-inputtext {
        width: 100px;
    }
}
:deep(.p-tabview-panel) {
    padding: 15px;
}
</style>
