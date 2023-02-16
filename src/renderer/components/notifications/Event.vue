<template>
    <div class="event" @click="onClick">
        <div class="text">{{ event.text }}</div>
        <div class="close" @click.stop="onClose">
            <Icon :icon="closeThick" height="21" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import closeThick from "@iconify-icons/mdi/close-thick";

import { Event } from "@/model/notifications";

const props = defineProps<{
    event: Event;
}>();

function onClick() {
    props.event?.action?.();
}

function onClose() {
    api.notifications.closeNotification(props.event);
}

if (props.event.timeoutMs) {
    setTimeout(() => {
        api.notifications.closeNotification(props.event);
    }, props.event.timeoutMs);
}
</script>

<style lang="scss" scoped>
.event {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 250px;
    height: 75px;
    position: relative;
    pointer-events: auto;
    border: 1px solid rgb(15, 15, 15);
    box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.11);
    background: linear-gradient(to bottom, rgba(31, 31, 31, 0.295), rgba(15, 15, 15, 0.616));
    backdrop-filter: blur(4px);
    &:hover {
        background: linear-gradient(to bottom, rgba(88, 88, 88, 0.295), rgba(53, 53, 53, 0.616));
    }
}
.text {
    text-align: center;
    font-size: 18px;
    padding: 6px 10px;
    padding-right: 20px;
}
.close {
    display: flex;
    position: absolute;
    top: 0;
    right: 0;
    padding: 5px;
    color: rgba(255, 255, 255, 0.3);
    margin-left: auto;
    &:hover {
        color: #fff;
    }
}
</style>
