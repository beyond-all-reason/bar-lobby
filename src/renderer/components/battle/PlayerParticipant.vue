<template>
    <div
        v-tooltip.bottom="syncStatus"
        class="participant"
        data-type="participant"
        @mouseenter.stop="onMouseEnter"
        @contextmenu="onRightClick"
    >
        <Flag class="flag" :countryCode="player.countryCode" />
        <div>{{ player.username }}</div>
        <div v-if="!player.battleStatus.isSpectator">
            <div class="ready" :class="{ isReady: player.battleStatus.ready }">⬤</div>
        </div>
        <Icon v-if="!isSynced" :icon="syncAlert" :height="16" color="#f00" />
    </div>
    <ContextMenu ref="menu" :model="actions" />
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import syncAlert from "@iconify-icons/mdi/sync-alert";
import { MenuItem } from "primevue/menuitem";
import { computed, inject, Ref, ref } from "vue";

import ContextMenu from "@/components/common/ContextMenu.vue";
import Flag from "@/components/misc/Flag.vue";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { User } from "@/model/user";

const props = defineProps<{
    battle: AbstractBattle;
    player: User;
}>();

const isSynced = computed(() => {
    const syncStatus = props.player.battleStatus.sync;
    return syncStatus.engine === 1 && syncStatus.game === 1 && syncStatus.map === 1;
});
const syncStatus = computed(() => {
    return `Engine: ${props.player.battleStatus.sync.engine * 100}%
        Game: ${props.player.battleStatus.sync.game * 100}%
        Map: ${props.player.battleStatus.sync.map * 100}%
        Ingame: ${props.player.battleStatus.inBattle}
        `;
});
const menu = ref<InstanceType<typeof ContextMenu>>();

const actions: MenuItem[] =
    props.player.userId === api.session.onlineUser.userId
        ? [
              { label: "View Profile", command: viewProfile },
              { label: "Message", command: messagePlayer },
              { label: "Kick", command: kickPlayer },
              { label: "Block", command: blockPlayer },
              { label: "Add Friend", command: addFriend },
              { label: "Report", command: reportPlayer },
          ]
        : [{ label: "View Profile", command: viewProfile }];

function onRightClick(event: MouseEvent) {
    if (menu.value) {
        menu.value.show(event);
    }
}

function viewProfile() {
    //
}

function kickPlayer() {
    //
}

const openMessages = inject<Ref<((userId: number) => void) | undefined>>("openMessages")!;

function messagePlayer() {
    if (!api.session.directMessages.has(props.player.userId)) {
        api.session.directMessages.set(props.player.userId, []);
    }

    if (openMessages.value) {
        openMessages.value(props.player.userId);
    }
}

function blockPlayer() {
    //
}

function addFriend() {
    //
}

function reportPlayer() {
    //
}

function onMouseEnter() {
    api.audio.play("button-hover");
}
</script>

<style lang="scss" scoped>
.participant {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    &.dragging {
        pointer-events: auto;
    }
    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
}
.flag {
    width: 16px;
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
