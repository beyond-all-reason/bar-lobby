<template>
    <ContextMenu :entries="actions" :args="[player]">
        <div v-tooltip.bottom="syncStatus" class="participant" data-type="participant" @mouseenter.stop="onMouseEnter">
            <Flag class="flag" :countryCode="player.countryCode" />
            <div>{{ player.username }}</div>
            <div v-if="!player.battleStatus.isSpectator">
                <div class="ready" :class="{ isReady: player.battleStatus.ready }">⬤</div>
            </div>
            <Icon v-if="!isSynced" :icon="syncAlert" :height="16" color="#f00" />
        </div>
    </ContextMenu>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import syncAlert from "@iconify-icons/mdi/sync-alert";
import { computed } from "vue";

import ContextMenu, { ContextMenuEntry } from "@/components/common/ContextMenu.vue";
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

const viewProfile = (player: User) => {
    //
};

const kickPlayer = (player: User) => {
    //
};

const messagePlayer = (player: User) => {
    //
};

const blockPlayer = (player: User) => {
    //
};

const addFriend = (player: User) => {
    //
};

const reportPlayer = (player: User) => {
    //
};

const playerActions: ContextMenuEntry[] = [
    { label: "View Profile", action: viewProfile },
    { label: "Message", action: messagePlayer },
    { label: "Kick", action: kickPlayer },
    { label: "Block", action: blockPlayer },
    { label: "Add Friend", action: addFriend },
    { label: "Report", action: reportPlayer },
];

const selfActions: ContextMenuEntry[] = [{ label: "View Profile", action: viewProfile }];

const actions = props.player.userId === api.session.onlineUser.userId || props.player.userId === -1 ? selfActions : playerActions;

const onMouseEnter = () => {
    api.audio.getSound("button-hover").play();
};
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
    &.isReady {
        color: rgb(121, 226, 0);
    }
}
</style>
