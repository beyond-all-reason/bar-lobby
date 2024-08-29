<template>
    <div :class="[`matchmaking-queue-status`, { visible: queueing }]">Searching for a game <img :src="pulseAnim" /></div>
</template>

<script lang="ts" setup>
import pulseAnim from "@/assets/images/icons/pulse-anim.svg?url";

const queueing = api.session.searchingForGame;
</script>

<style lang="scss" scoped>
.matchmaking-queue-status {
    background: #111;
    padding: 5px 10px;
    position: absolute;
    top: 10px;
    right: 0;
    z-index: 2;
    transform: translateX(100%);
    transition: transform 0.2s;
    &.visible {
        transform: translateX(0%);
    }
}
.searching-loader {
    position: absolute;
    top: 0;
    right: 0;
}
</style>
