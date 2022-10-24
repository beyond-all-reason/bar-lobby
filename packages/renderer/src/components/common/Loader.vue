<template>
    <div :class="{ fullsize: absolutePosition, 'flex-center': absolutePosition }">
        <div class="loader la-ball-clip-rotate-multiple">
            <div />
            <div />
        </div>
    </div>
</template>

<script lang="ts" setup>
const props = withDefaults(
    defineProps<{
        absolutePosition?: boolean;
    }>(),
    {
        absolutePosition: true,
    }
);
</script>

<style lang="scss" scoped>
.loader {
    //background: radial-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0) 50%);
    padding: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

/*!
 * Load Awesome v1.1.0 (http://github.danielcardoso.net/load-awesome/)
 * Copyright 2015 Daniel Cardoso <@DanielCardoso>
 * Licensed under MIT
 */
@keyframes ball-clip-rotate-multiple-rotate {
    0% {
        transform: translate(-50%, -50%) rotate(0deg);
    }
    50% {
        transform: translate(-50%, -50%) rotate(180deg);
    }
    100% {
        transform: translate(-50%, -50%) rotate(360deg);
    }
}
.fullsize {
    left: 0;
    top: 0;
}
.la-ball-clip-rotate-multiple {
    position: relative;
    box-sizing: border-box;
    display: block;
    font-size: 0;
    color: #fff;
    > div {
        position: relative;
        box-sizing: border-box;
        display: inline-block;
        float: none;
        background-color: currentColor;
        border: 0 solid currentColor;
        position: absolute;
        top: 50%;
        left: 50%;
        background: transparent;
        border-style: solid;
        border-width: 2px;
        border-radius: 100%;
        animation: ball-clip-rotate-multiple-rotate 1s ease-in-out infinite;
        &:first-child {
            position: absolute;
            width: 32px;
            height: 32px;
            border-right-color: transparent;
            border-left-color: transparent;
        }
        &:last-child {
            width: 16px;
            height: 16px;
            border-top-color: transparent;
            border-bottom-color: transparent;
            animation-duration: 0.5s;
            animation-direction: reverse;
        }
    }
}
.la-ball-clip-rotate-multiple.la-dark {
    color: #333;
}
.la-ball-clip-rotate-multiple.la-sm {
    width: 16px;
    height: 16px;
    > div {
        border-width: 1px;
        &:first-child {
            width: 16px;
            height: 16px;
        }
        &:last-child {
            width: 8px;
            height: 8px;
        }
    }
}
.la-ball-clip-rotate-multiple.la-2x {
    width: 64px;
    height: 64px;
    > div {
        border-width: 4px;
        &:first-child {
            width: 64px;
            height: 64px;
        }
        &:last-child {
            width: 32px;
            height: 32px;
        }
    }
}
.la-ball-clip-rotate-multiple.la-3x {
    width: 96px;
    height: 96px;
    > div {
        border-width: 6px;
        &:first-child {
            width: 96px;
            height: 96px;
        }
        &:last-child {
            width: 48px;
            height: 48px;
        }
    }
}
</style>
