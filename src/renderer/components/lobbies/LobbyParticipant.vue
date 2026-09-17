<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div @contextmenu="onRightClick">
        <TeamParticipant>
            <Icon v-if="isBoss" :icon="hammerIcon" class="boss-icon" />
            <div>{{ displayName }}</div>
            <div class="flex-row flex-right flex-center">
                <div class="flex-row flex-center gap-sm">
                    <Icon v-if="isSynced" :icon="checkBold" :height="16" color="#0f0" />
                    <Icon v-else :icon="cloudDownload" :height="16" color="#f00" />
                </div>
            </div>
        </TeamParticipant>
        <ContextMenu ref="menu" :model="actions" />
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import checkBold from "@iconify-icons/mdi/check-bold";
import cloudDownload from "@iconify-icons/mdi/cloud-download";
import { delay } from "$/jaz-ts-utils/delay";
import type { Member } from "@renderer/components/lobbies/lobby.types";
import { computed, inject, Ref, ref } from "vue";
import { useTypedI18n } from "@renderer/i18n";
import TeamParticipant from "@renderer/components/battle/TeamParticipant.vue";
import ContextMenu from "primevue/contextmenu";
import { useRouter } from "vue-router";
import { me } from "@renderer/store/me.store";
import { computedAsync } from "@vueuse/core";
import { User } from "@main/model/user";
import { db } from "@renderer/store/db";
import { lobby } from "@renderer/store/lobby.store";
import { friends } from "@renderer/store/me.store";
import hammerIcon from "@iconify-icons/mdi/hammer";

const { t } = useTypedI18n();
const router = useRouter();

const props = defineProps<{
    player: Member;
    isBoss: boolean;
}>();

const displayName = computedAsync(async () => {
    // User and number is only shown as a placeholder if we have a delay in getting the user's name from the server
    const name = t("lobby.navbar.messages.userID") + " " + props.player.id;
    if (props.player.id) {
        const cached: User = (await db.users.get(props.player.id)) as User;
        if (cached != undefined) {
            return await cached.username;
        }
    }
    return name;
});

// Right now we are just pretending everyone is synced
const isSynced = computed(() => {
    return true;
});

const menu = ref<InstanceType<typeof ContextMenu>>();

const actions =
    props.player.id === me.userId
        ? [
              { label: t("lobby.components.battle.playerParticipant.viewProfile"), command: viewProfile },
              { label: t("lobby.components.battle.playerParticipant.makeBoss"), command: makeBoss },
              //   { label: "Add Bonus", command: addBonus },
          ]
        : [
              { label: t("lobby.components.battle.playerParticipant.viewProfile"), command: viewProfile },
              { label: t("lobby.components.battle.playerParticipant.message"), command: messagePlayer },
              //{ label: "Block", command: blockPlayer },
              { label: t("lobby.components.battle.playerParticipant.addFriend"), command: addFriend },
              { label: t("lobby.components.battle.playerParticipant.kick"), command: kickPlayer },
              {
                  label: t("lobby.components.battle.playerParticipant.more"),
                  items: [
                      { label: t("lobby.components.battle.playerParticipant.makeBoss"), command: makeBoss },
                      //   { label: "Add Bonus", command: addBonus },
                  ],
              },
              //{ label: "Report", command: reportPlayer },
          ];

function onRightClick(event: MouseEvent) {
    if (menu.value) {
        menu.value.show(event);
    }
}

async function viewProfile() {
    await router.push(`/profile/${props.player.id}`);
}

async function kickPlayer() {
    lobby.requestKickBan(props.player.id);
}

const toggleMessages = inject<Ref<((open?: boolean, userId?: string) => void) | undefined>>("toggleMessages")!;
async function messagePlayer() {
    if (toggleMessages.value) {
        await delay(10); // needed because the v-click-away directive tells the messages popout to close on the same frame as this would otherwise tell it to open
        toggleMessages.value(true, props.player.id);
    }
}

async function makeBoss() {
    lobby.requestAppointBoss(props.player.id);
}

async function addFriend() {
    friends.sendRequest(props.player.id);
}
</script>

<style lang="scss" scoped>
.flag {
    width: 20px;
}
.ready {
    font-size: 12px;
    color: rgb(226, 0, 0);
    text-shadow: none;
    &.isReady {
        color: rgb(121, 226, 0);
    }
}
.boss-icon {
    color: gold;
    size: 24px;
}
</style>
