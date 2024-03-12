<template>
    <div class="sticky-battle flex-row" :class="{ hidden: !battle || route.path === '/multiplayer/battle' }" @click="openBattle">
        <div class="leave" @click.stop="leaveBattle">
            <Icon :icon="closeThick" height="18" />
        </div>
        <div class="title flex-col flex-center">
            <Icon :color="color" :icon="swordCross" height="32"></Icon>
        </div>
        <div class="flex-col flex-center-content">
            <div class="label">{{ battle?.battleOptions.title }}</div>
            <div class="flex-row gap-md">
                <div class="flex-row flex-center gap-xs">
                    <Icon :icon="accountIcon" height="18" />
                    <div>{{ playerCount }}</div>
                </div>
                <div class="flex-row flex-center gap-sm">
                    <Icon :icon="robotIcon" height="18" />
                    <div>{{ botCount }}</div>
                </div>
                <div class="flex-row flex-center gap-xs">
                    <Icon :icon="eyeIcon" height="18" />
                    <div>{{ specCount }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import accountIcon from "@iconify-icons/mdi/account";
import closeThick from "@iconify-icons/mdi/close-thick";
import eyeIcon from "@iconify-icons/mdi/eye";
import robotIcon from "@iconify-icons/mdi/robot";
import swordCross from "@iconify-icons/mdi/sword-cross";
import { computed } from "vue";

import { isOnlineCustomBattle } from "@/model/battle/online-custom-battle";

const route = api.router.currentRoute;
const me = api.session.onlineUser;
const battle = computed(() =>
    api.session.onlineBattle.value && isOnlineCustomBattle(api.session.onlineBattle.value) ? api.session.onlineBattle.value : null
);
const playerCount = computed(() => battle.value?.contenders.value.filter((c) => "userId" in c).length);
const botCount = computed(() => battle.value?.bots.length);
const specCount = computed(() => battle.value?.spectators.value.length);
const color = computed(() => {
    // if (me.battleStatus && me.battleStatus.sync.engine < 1 || me.battleStatus.sync.game < 1 || me.battleStatus.sync.map < 1) {
    //     return "rgb(165, 30, 30)";
    // } else if (!me.battleStatus?.ready) {
    //     return "rgb(243, 213, 79)";
    // } else {
    //     return "rgb(120, 189, 57)";
    // }
    return "rgb(120, 189, 57)";
});

async function openBattle() {
    await api.router.push("/multiplayer/battle");
}

function leaveBattle() {
    battle.value?.leave();
}
</script>

<style lang="scss" scoped>
.sticky-battle {
    position: absolute;
    bottom: 5px;
    left: -40px;
    z-index: 1;
    padding: 7px 25px 5px 50px;
    gap: 10px;
    transition: all 0.1s ease-in-out;
    will-change: left;
    &.hidden {
        left: -400px !important;
    }
    &:before {
        @extend .fullsize;
        left: 0;
        top: 0;
        z-index: -1;
        background: linear-gradient(90deg, rgba(0, 0, 0, 0.4) 60%, rgba(0, 0, 0, 0) 100%);
        backdrop-filter: blur(8px) brightness(300%) saturate(150%);
        transform: skewX(30deg);
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        border-right: 1px solid rgba(255, 255, 255, 0.25);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 3px 2px 10px rgba(0, 0, 0, 0.3);
    }
    &:hover {
        left: 0;
        &:before {
            backdrop-filter: blur(8px) brightness(400%) saturate(200%);
        }
    }
}
.title {
    font-size: 27px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.label {
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    opacity: 0.7;
}
.leave {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(rgba(219, 57, 57, 0.9), rgba(153, 26, 26, 0.9));
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0);
    border-right: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    &:hover {
        filter: brightness(1.2);
    }
}
</style>
