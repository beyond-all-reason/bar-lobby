<template>
    <Control :class="{ selected: isSelected }" @click="onClick">
        <slot></slot>
    </Control>
</template>

<script setup lang="ts">
import Control from "@renderer/components/controls/Control.vue";

const isSelected = defineModel<boolean>("checked");

function onClick() {
    isSelected.value = !isSelected.value;
}
</script>

<style lang="scss" scoped>
.control {
    flex-grow: 1;
    &.selected {
        background-color: rgba(255, 255, 255, 0.7);
        &:hover {
            background-color: rgba(255, 255, 255, 0.6);
        }
    }
}
.check-wrapper {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    width: 44px;
}
img.icon {
    display: block;
    width: 24px;
    height: 24px;
}
</style>
