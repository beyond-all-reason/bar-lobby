<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <TeamParticipant @contextmenu="onRightClick">
        <div>
            <Flag class="flag" :countryCode="player.user.countryCode" />
        </div>
        <div>{{ player.user.username }}</div>
    </TeamParticipant>
    <ContextMenu ref="menu" :model="actions" />
</template>

<script lang="ts" setup>
import { delay } from "$/jaz-ts-utils/delay";
import { inject, Ref, ref } from "vue";
import { useTypedI18n } from "@renderer/i18n";

import TeamParticipant from "@renderer/components/battle/TeamParticipant.vue";
import ContextMenu from "@renderer/components/common/ContextMenu.vue";
import Flag from "@renderer/components/misc/Flag.vue";
import { useRouter } from "vue-router";
import { Player } from "@main/game/battle/battle-types";
import { me } from "@renderer/store/me.store";

const { t } = useTypedI18n();

const router = useRouter();

const props = defineProps<{
    player: Player;
}>();

const menu = ref<InstanceType<typeof ContextMenu>>();

const actions =
    props.player!.user.userId === me.userId
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

async function viewProfile() {
    await router.push(`/profile/${props.player.user.userId}`);
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
        toggleMessages.value(true, props.player.user.userId);
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
