<template>
    <TeamParticipant :battle="battle" @contextmenu="onRightClick">
        <div>
            <Flag class="flag" :countryCode="player.countryCode" />
        </div>
        <div>{{ player.username }}</div>
    </TeamParticipant>
    <ContextMenu ref="menu" :model="actions" />
</template>

<script lang="ts" setup>
import { delay } from "jaz-ts-utils";
import { MenuItem } from "primevue/menuitem";
import { inject, Ref, ref } from "vue";

import TeamParticipant from "@/components/battle/TeamParticipant.vue";
import ContextMenu from "@/components/common/ContextMenu.vue";
import Flag from "@/components/misc/Flag.vue";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { User } from "@/model/user";

const props = defineProps<{
    battle: AbstractBattle;
    player: User;
}>();

const menu = ref<InstanceType<typeof ContextMenu>>();

const actions: MenuItem[] =
    props.player.userId === api.session.onlineUser.userId
        ? [
              { label: "View Profile", command: viewProfile },
              { label: "Make Boss", command: makeBoss },
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
                  items: [{ label: "Make Boss", command: makeBoss }],
              },
              //{ label: "Report", command: reportPlayer },
          ];

function onRightClick(event: MouseEvent) {
    if (menu.value) {
        menu.value.show(event);
    }
}

async function viewProfile() {
    await api.router.push(`/profile/${props.player.userId}`);
}

async function kickPlayer() {
    await api.comms.request("c.lobby.message", {
        message: `!cv kick ${props.player.username}`,
    });
}

async function ringPlayer() {
    await api.comms.request("c.lobby.message", {
        message: `!ring ${props.player.username}`,
    });
}

const toggleMessages = inject<Ref<((open?: boolean, userId?: number) => void) | undefined>>("toggleMessages")!;
async function messagePlayer() {
    if (!api.session.directMessages.has(props.player.userId)) {
        api.session.directMessages.set(props.player.userId, []);
    }

    if (toggleMessages.value) {
        await delay(10); // needed because the v-click-away directive tells the messages popout to close on the same frame as this would otherwise tell it to open
        toggleMessages.value(true, props.player.userId);
    }
}

async function makeBoss() {
    await api.comms.request("c.lobby.message", {
        message: `!cv boss ${props.player.username}`,
    });
}

async function blockPlayer() {
    // TODO
}

async function addFriend() {
    await api.comms.request("c.user.add_friend", {
        user_id: props.player.userId,
    });
}

function reportPlayer() {
    // TODO
}
</script>

<style lang="scss" scoped></style>
