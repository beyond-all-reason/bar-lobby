<template>
    <div class="status-info flex-row" :class="{ hidden: false }">
        <div class="status-info__title flex-col flex-center">2v2</div>
        <div class="flex-col flex-center-content">
            <div class="status-info__label">Custom Battle</div>
            <div class="status-info__content">Unready</div>
        </div>
    </div>
</template>

<script lang="ts" setup></script>

<style lang="scss" scoped>
.status-info {
    position: absolute;
    bottom: 5px;
    left: -40px;
    z-index: 1;
    padding: 7px 25px 5px 50px;
    gap: 10px;
    transition: left 0.1s ease-in-out;
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
    &__title {
        font-size: 38px;
    }
    &__label {
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        opacity: 0.7;
    }
    &__content {
    }
}
</style>
