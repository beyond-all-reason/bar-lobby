<template>
    <div class="participant" data-type="participant" @mouseenter.stop="onMouseEnter">
        <slot></slot>
    </div>
</template>

<script lang="ts" setup>
import { AbstractBattle } from "@/model/battle/abstract-battle";

const props = defineProps<{
    battle: AbstractBattle;
}>();

function onMouseEnter() {
    api.audio.play("button-hover");
}
</script>

<style lang="scss" scoped>
.participant {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 14px;
    &.dragging {
        pointer-events: auto;
    }
    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
}
</style>
