<template>
    <div class="sticky-battle flex-row" :class="{ hidden: !battle || route.name === 'multiplayer-battle' }" :battle="battle" @click="openBattle">
        <div class="title flex-col flex-center">{{ title }}</div>
        <div class="flex-col flex-center-content">
            <div class="label">Custom Battle</div>
            <div class="content">Unready</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const battle = api.session.onlineBattle;
const title = computed(() => {
    let title = `😢`;
    const teams = battle.value?.teams;
    if (teams?.value) {
        const teamCounts = Array.from(teams.value.values()).map((team) => team.length);
        if (teamCounts.length) {
            title = teamCounts.join("v");
        }
    }
    return title;
});

const openBattle = () => {
    api.router.push("/multiplayer/battle");
};
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
        left: -400px;
    }
    &:before {
        @extend .fullsize;
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
        left: -30px;
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
</style>
