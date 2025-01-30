<template>
    <TeamParticipant @contextmenu="onRightClick">
        <div>
            <Flag class="flag" :countryCode="player.user.countryCode" />
        </div>
        <div>{{ player.user.username }}</div>
        <div class="flex-row flex-right flex-center">
            <div class="flex-row flex-center gap-sm">
                <!-- <div
                    v-if="player.battleStatus.teamId > 0 && isSpadsBattle(battle)"
                    class="ready"
                    :class="{ isReady: player.battleStatus.ready }"
                >
                    ⬤
                </div> -->
                <Icon v-if="isSynced" :icon="checkBold" :height="16" color="#0f0" />
                <Icon v-else :icon="cloudDownload" :height="16" color="#f00" />
            </div>
        </div>
    </TeamParticipant>
    <ContextMenu ref="menu" :model="actions" />
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import checkBold from "@iconify-icons/mdi/check-bold";
import cloudDownload from "@iconify-icons/mdi/cloud-download";
import { delay } from "$/jaz-ts-utils/delay";
import { MenuItem } from "primevue/menuitem";
import { computed, inject, Ref, ref } from "vue";

import TeamParticipant from "@renderer/components/battle/TeamParticipant.vue";
import ContextMenu from "@renderer/components/common/ContextMenu.vue";
import Flag from "@renderer/components/misc/Flag.vue";
import { useRouter } from "vue-router";
import { Player } from "@main/game/battle/battle-types";
import { me } from "@renderer/store/me.store";

const router = useRouter();

const props = defineProps<{
    player: Player;
}>();

const isSynced = computed(() => {
    const syncStatus = props.player.contentSyncState;
    if (!syncStatus) return false;
    return syncStatus.engine === 1 && syncStatus.game === 1 && syncStatus.map === 1;
});

const menu = ref<InstanceType<typeof ContextMenu>>();

const actions: MenuItem[] =
    props.player.user.userId === me.userId
        ? [
              { label: "View Profile", command: viewProfile },
              { label: "Make Boss", command: makeBoss },
              //   { label: "Add Bonus", command: addBonus },
          ]
        : [
              { label: "View Profile", command: viewProfile },
              { label: "Message", command: messagePlayer },
              //{ label: "Block", command: blockPlayer },
              { label: "Add Friend", command: addFriend },
              { label: "Kick", command: kickPlayer },
              { label: "Ring", command: ringPlayer },
              {
                  label: "More",
                  items: [
                      { label: "Make Boss", command: makeBoss },
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
</style>
