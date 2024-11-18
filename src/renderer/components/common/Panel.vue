<template>
    <div class="panel" :class="{ empty }">
        <div v-if="$slots.header" class="header">
            <slot name="header" />
        </div>

        <div class="content" :style="{ padding: noPadding ? 0 : '30px' }">
            <slot />
        </div>

        <div v-if="$slots.footer" class="footer">
            <slot name="footer" />
        </div>
    </div>
</template>

<script lang="ts" setup>
defineProps<{
    empty?: boolean;
    noPadding?: boolean;
}>();
</script>

<style lang="scss" scoped>
.panel {
    position: relative;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    background: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6));
    backdrop-filter: blur(10px) brightness(1) saturate(2); //doesn't support opacity transition
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    border-bottom: 1px solid rgba(124, 124, 124, 0.3);
    box-shadow:
        -1px 0 0 rgba(0, 0, 0, 0.3),
        1px 0 0 rgba(0, 0, 0, 0.3),
        0 1px 0 rgba(0, 0, 0, 0.3),
        0 -1px 0 rgba(0, 0, 0, 0.3),
        inset 0 0 50px rgba(255, 255, 255, 0.15),
        inset 0 3px 8px rgba(255, 255, 255, 0.1),
        3px 3px 10px rgba(0, 0, 0, 0.8);
    &.empty {
        background: transparent;
        backdrop-filter: none;
        border-color: transparent;
        box-shadow: none;
        &:after {
            background: none;
        }
    }
    .content {
        position: relative;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }
    .header {
        position: relative;
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        width: 100%;
        z-index: 1;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        :deep(.control.button) {
            align-self: unset;
        }
        :deep(.button) {
            background: transparent;
            border: none;
            box-shadow: none;
            &:hover,
            &.active {
                background: rgba(255, 255, 255, 0.1);
                box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.3);
            }
        }
    }
}

.panel:after {
    @extend .fullsize;
    left: 0;
    top: 0;
    background-image: url("/src/renderer/assets/images/squares.png");
    background-size: auto;
    opacity: 0.3;
    mix-blend-mode: overlay; // doesn't support transition
    z-index: -1;
}
</style>
