<template>
    <div ref="control" class="control" :class="{ disabled }" @mouseenter="onMouseEnter" @click.self="focus">
        <div v-if="label" class="label" @click="focus">{{ label }}</div>
        <slot />
    </div>
</template>

<script lang="ts" setup>
import { audioApi } from "@renderer/audio/audio";
import { Ref, ref } from "vue";

defineProps<{
    label?: string;
    disabled?: boolean;
}>();

const control: Ref<HTMLElement | null> = ref(null);

function focus() {
    if (control.value) {
        const slotEl = control.value.lastElementChild as HTMLElement | null;
        if (slotEl) {
            slotEl.click();
            slotEl.focus();
        }
    }
}

function onMouseEnter() {
    audioApi.play("button-hover");
}
</script>

<style lang="scss" scoped>
.control {
    display: flex;
    align-self: stretch;
    align-items: center;
    justify-self: flex-start;
    background-color: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    &:hover {
        background-color: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.2);
    }
    .label {
        padding: 5px 10px;
        border-radius: 0px;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        align-self: stretch;
        align-items: center;
        justify-content: center;
        display: flex;
        white-space: nowrap;
    }
    &.disabled {
        opacity: 0.5;
        pointer-events: none;
    }
    &.dark {
        background-color: rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        &:hover {
            background-color: rgba(0, 0, 0, 0.3);
            border-color: rgba(255, 255, 255, 0.1);
        }
    }
}
</style>
