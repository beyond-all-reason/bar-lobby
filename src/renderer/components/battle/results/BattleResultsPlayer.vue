<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div @contextmenu.prevent="onRightClick">
        <TeamParticipant :class="{ me: isMe }">
            <Flag class="flag" :countryCode="user.countryCode" />
            <div class="name">{{ name }}</div>
        </TeamParticipant>
        <ContextMenu v-if="!isMe" ref="menu" :model="actions" />
    </div>
</template>

<script lang="ts" setup>
import { computed, inject, ref, type Ref } from "vue";
import { useRouter } from "vue-router";
import { delay } from "$/jaz-ts-utils/delay";
import type { User } from "@main/model/user";
import TeamParticipant from "@renderer/components/battle/TeamParticipant.vue";
import ContextMenu from "@renderer/components/common/ContextMenu.vue";
import Flag from "@renderer/components/misc/Flag.vue";
import { useTypedI18n } from "@renderer/i18n";
import { db } from "@renderer/store/db";
import { friends, me } from "@renderer/store/me.store";
import { chat } from "@renderer/store/chat.store";
import { notificationsApi } from "@renderer/api/notifications";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { reportUserIconClass, useReportUser } from "@renderer/composables/useReportUser";
import { usePartyInviteState } from "@renderer/composables/usePartyInviteState";
import { useBattleResults } from "@renderer/composables/useBattleResults";

const props = defineProps<{
    userId: string;
    name: string;
}>();

const { t } = useTypedI18n();
const router = useRouter();
const { openReportUser } = useReportUser();
const { close: closeResults } = useBattleResults();
const { maxMembersReached, userInParty, userInvited, inviteToParty } = usePartyInviteState(() => props.userId);

// Participants we have never seen before only reach db.users once the modal's subscription is
// answered, so this stands in until then and gets replaced when they arrive.
const liveUser = useDexieLiveQueryWithDeps([() => props.userId], () => db.users.get(props.userId));
const user = computed<User>(
    () =>
        liveUser.value ?? {
            userId: props.userId,
            username: props.name,
            displayName: props.name,
            clanId: null,
            partyId: null,
            countryCode: "??",
            status: "offline",
            battleRoomState: {},
        }
);

const isMe = computed(() => props.userId === me.userId);
const isOnline = computed(() => user.value.status !== "offline");

const menu = ref<InstanceType<typeof ContextMenu>>();

const actions = computed(() => {
    const items: { label: string; icon?: string; disabled?: boolean; command?: () => void }[] = [
        { label: t("lobby.components.battle.playerParticipant.viewProfile"), command: viewProfile },
        { label: t("lobby.components.battle.playerParticipant.message"), command: messagePlayer },
    ];

    if (me.incomingFriendRequestUserIds.has(props.userId)) {
        items.push({ label: t("lobby.components.battle.battleResults.acceptFriendRequest"), command: acceptFriendRequest });
    } else if (!me.friendUserIds.has(props.userId) && !me.outgoingFriendRequestUserIds.has(props.userId)) {
        items.push({ label: t("lobby.components.battle.playerParticipant.addFriend"), command: addFriend });
    }

    if (isOnline.value && !userInParty.value && !userInvited.value) {
        items.push(
            maxMembersReached.value
                ? { label: t("lobby.components.battle.battleResults.partyFull"), disabled: true }
                : { label: t("lobby.components.battle.battleResults.inviteToParty"), command: inviteToParty }
        );
    }

    items.push({
        label: t("lobby.components.user.reportUser.menuLabel"),
        icon: reportUserIconClass,
        command: () => openReportUser(user.value),
    });

    return items;
});

function onRightClick(event: MouseEvent) {
    if (isMe.value) return;
    menu.value?.show(event);
}

async function viewProfile() {
    closeResults();
    await router.push(`/profile/${props.userId}`);
}

const toggleMessages = inject<Ref<((open?: boolean, userId?: string) => void) | undefined>>("toggleMessages");
async function messagePlayer() {
    closeResults();
    chat.addNewUserChat(props.userId);
    if (toggleMessages?.value) {
        await delay(10); // needed because the v-click-away directive tells the messages popout to close on the same frame as this would otherwise tell it to open
        toggleMessages.value(true, props.userId);
    }
}

async function addFriend() {
    try {
        await friends.sendRequest(props.userId);
    } catch (error) {
        console.error("Failed to send friend request:", error);
        notificationsApi.alert({ text: t("lobby.navbar.friends.notifications.errors.generic"), severity: "error" });
    }
}

async function acceptFriendRequest() {
    try {
        await friends.acceptRequest(props.userId);
    } catch (error) {
        console.error("Failed to accept friend request:", error);
        notificationsApi.alert({ text: t("lobby.navbar.friends.notifications.errors.failedToAccept"), severity: "error" });
    }
}
</script>

<style lang="scss" scoped>
.flag {
    width: 20px;
}
.name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.me {
    border-color: rgba(255, 215, 0, 0.5);
    background: rgba(255, 215, 0, 0.08);
}
</style>
