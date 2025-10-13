<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <TeamParticipant @contextmenu="onRightClick">
        <div>{{ displayName }}</div>
    </TeamParticipant>
    <ContextMenu ref="menu" :model="onlineActions" />
</template>

<script lang="ts" setup>
import { delay } from "$/jaz-ts-utils/delay";
import { inject, Ref, ref } from "vue";
import { useTypedI18n } from "@renderer/i18n";

import TeamParticipant from "@renderer/components/battle/TeamParticipant.vue";
import ContextMenu from "@renderer/components/common/ContextMenu.vue";
import { useRouter } from "vue-router";
import { computedAsync } from "@vueuse/core";
import { User } from "@main/model/user";
import { getUserByID } from "@renderer/store/users.store";
import { UserId } from "tachyon-protocol/types";
import { me } from "@renderer/store/me.store";

const { t } = useTypedI18n();

const router = useRouter();

const props = defineProps<{
    member: Member;
}>();

interface Member {
    id: UserId;
    joinQueuePostion?: number;
}

const displayName = computedAsync(async () => {
    if (!props.member || !props.member.id) return ""; //It's possible that the server can send us empty positions!
    // User and number is only shown as a placeholder if we have a delay in getting the user's name
    const name = t("lobby.navbar.messages.userID") + " " + props.member.id;
    if (props.member.id) {
        const cached: User = (await getUserByID(props.member.id)) as User;
        if (cached != undefined) {
            return await cached.username;
        }
    }
    return name;
});

const menu = ref<InstanceType<typeof ContextMenu>>();

// We can add these later when they exist.
const onlineActions =
    props.member.id == me.userId
        ? [
              { label: t("lobby.components.battle.playerParticipant.viewProfile"), command: viewProfile },
              { label: t("lobby.components.battle.playerParticipant.makeBoss"), command: makeBoss },
          ]
        : [
              { label: t("lobby.components.battle.playerParticipant.viewProfile"), command: viewProfile },
              { label: t("lobby.components.battle.playerParticipant.message"), command: messagePlayer },
              //{ label: "Block", command: blockPlayer },
              { label: t("lobby.components.battle.playerParticipant.addFriend"), command: addFriend },
              { label: t("lobby.components.battle.playerParticipant.kick"), command: kickPlayer },
              { label: t("lobby.components.battle.playerParticipant.ring"), command: ringPlayer },
              {
                  label: t("lobby.components.battle.playerParticipant.more"),
                  items: [{ label: t("lobby.components.battle.playerParticipant.makeBoss"), command: makeBoss }],
              },
              //{ label: "Report", command: reportPlayer },
          ];

function onRightClick(event: MouseEvent) {
    if (menu.value) {
        menu.value.show(event);
    }
}

// TODO: Do a lookup from server data if this is an online user
async function viewProfile() {
    await router.push(`/profile/${props.member.id}`);
}

async function kickPlayer() {
    // await api.comms.request("c.lobby.message", {
    //     message: `!cv kick ${props.player.user.username}`,
    // });
}

async function ringPlayer() {
    // await api.comms.request("c.lobby.message", {
    //     message: `!ring ${props.player.user.username}`,
    // });
}

const toggleMessages = inject<Ref<((open?: boolean, userId?: string) => void) | undefined>>("toggleMessages")!;

async function messagePlayer() {
    // if (!api.session.directMessages.has(props.player.user.userId)) {
    //     api.session.directMessages.set(props.player.user.userId, []);
    // }
    if (toggleMessages.value) {
        await delay(10); // needed because the v-click-away directive tells the messages popout to close on the same frame as this would otherwise tell it to open
        toggleMessages.value(true, props.member.id);
    }
}

async function makeBoss() {
    // await api.comms.request("c.lobby.message", {
    //     message: `!cv boss ${props.player.user.username}`,
    // });
}

async function addFriend() {
    // await api.comms.request("c.user.add_friend", {
    //     user_id: props.player.user.userId,
    // });
}
</script>

<style lang="scss" scoped></style>
