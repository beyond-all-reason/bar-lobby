<template>
    <div class="participant" data-type="participant" @mouseenter.stop="onMouseEnter">
        <slot></slot>
    </div>
</template>

<script lang="ts" setup>
import { audioApi } from "@renderer/audio/audio";

function onMouseEnter() {
    audioApi.play("button-hover");
}
</script>

<style lang="scss" scoped>
.participant {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 20px;
    backdrop-filter: blur(5px);
    filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.8));
    &.dragging {
        pointer-events: auto;
    }
    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
}
</style>
