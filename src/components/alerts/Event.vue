<template>
    <div class="event">
        <div class="close" @click="onClose"><Icon :icon="closeThick" height="21"></Icon></div>
        {{ event.content }}
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import closeThick from "@iconify-icons/mdi/close-thick";

import { EventAlert } from "@/model/alert";

const props = defineProps<{
    event: EventAlert;
}>();

const onClose = () => {
    api.alerts.closeAlert(props.event);
};
</script>

<style lang="scss" scoped>
.event {
    display: block;
    padding: 6px 10px;
    gap: 5px;
    max-width: 250px;
    pointer-events: auto;
    font-size: 16px;
    border: 1px solid rgb(15, 15, 15);
    box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.11);
    background: linear-gradient(to bottom, rgba(31, 31, 31, 0.295), rgba(15, 15, 15, 0.616));
    text-align: left;
    backdrop-filter: blur(4px);
    &:before {
        @extend .fullsize;
        background-image: url("~@/assets/images/squares.png");
        background-size: auto;
        opacity: 0.3;
        z-index: -1;
    }
    &:hover {
        background: linear-gradient(to bottom, rgba(88, 88, 88, 0.295), rgba(53, 53, 53, 0.616));
    }
}
.close {
    float: right;
    position: relative;
    color: rgba(255, 255, 255, 0.7);
    padding-bottom: 5px;
    margin: {
        left: 5px;
        bottom: 5px;
    }
    &:after {
        @extend .fullsize;
        width: calc(100% + 10px);
        height: calc(100% + 10px);
        top: -5px;
    }
    &:hover {
        color: #fff;
    }
}
</style>
