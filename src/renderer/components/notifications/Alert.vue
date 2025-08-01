<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div :class="`alert ${alert.severity}`">
        <div class="icon"><Icon :icon="icon" height="21"></Icon></div>
        <div class="text">{{ alert.text }}</div>
        <div class="close" @click="onClose"><Icon :icon="closeThick" height="21"></Icon></div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import alertCircleOutline from "@iconify-icons/mdi/alert-circle-outline";
import alertOutline from "@iconify-icons/mdi/alert-outline";
import closeThick from "@iconify-icons/mdi/close-thick";
import infoOutline from "@iconify-icons/mdi/information-outline";
import { computed } from "vue";

import { Alert } from "@renderer/model/notifications";

import { notificationsApi } from "@renderer/api/notifications";

const props = defineProps<{
    alert: Alert;
}>();

const icon = computed(() => {
    if (props.alert.severity === "error") {
        return alertCircleOutline;
    } else if (props.alert.severity === "warning") {
        return alertOutline;
    } else {
        return infoOutline;
    }
});

function onClose() {
    notificationsApi.closeNotification(props.alert);
}

if (props.alert.timeoutMs) {
    setTimeout(() => {
        notificationsApi.closeNotification(props.alert);
    }, props.alert.timeoutMs);
}

if (props.alert.timeoutMs) {
    setTimeout(() => {
        // api.notifications.closeNotification(props.alert);
    }, props.alert.timeoutMs);
}
</script>

<style lang="scss" scoped>
.alert {
    display: flex;
    align-self: center;
    border-radius: 3px;
    pointer-events: auto;
    text-align: center;
    flex-direction: row;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    font-size: 16px;
    box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
    height: 30px;
    overflow: hidden;
    margin-bottom: 5px;
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    background: linear-gradient(to bottom, rgb(84, 94, 110), rgb(63, 69, 99));
    max-width: fit-content;
    &.error {
        border-top: 1px solid rgba(255, 255, 255, 0.5);
        background: linear-gradient(to bottom, rgb(204, 22, 22), rgb(155, 0, 0));
    }
    &.warning {
        border-top: 1px solid rgba(255, 255, 255, 0.7);
        background: linear-gradient(to bottom, rgb(216, 168, 11), rgb(167, 124, 6));
    }
}
.icon {
    display: flex;
    padding-left: 10px;
}
.text {
    white-space: nowrap;
}
.close {
    color: rgba(255, 255, 255, 0.7);
    padding-right: 10px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    &:hover {
        color: #fff;
    }
}
</style>
