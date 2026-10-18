<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="fullsize notifications">
        <TransitionGroup name="list" class="alerts" tag="div">
            <AlertComponent v-for="notification in notifications.alerts" :key="notification.id" :alert="notification" />
        </TransitionGroup>
        <TransitionGroup name="list" class="events" tag="div">
            <EventComponent v-for="event in notifications.events" :key="event.id" :event="event" />
        </TransitionGroup>
    </div>
</template>

<script lang="ts" setup>
import { onMounted } from "vue";
import AlertComponent from "@renderer/components/notifications/Alert.vue";
import EventComponent from "@renderer/components/notifications/Event.vue";
import { notificationsApi } from "@renderer/api/notifications";
import { contentApi } from "@renderer/api/content";
import { editionLogic } from "@renderer/logic/edition";
import { useTypedI18n } from "@renderer/i18n";

const { t } = useTypedI18n();

const notifications = notificationsApi;

onMounted(() => {
    window.notifications.onShowAlert((alertConfig) => {
        notificationsApi.alert(alertConfig);
    });
    // Whatever asked for the content only learns that its request failed, so the reason is told here,
    // once for every path that can ask: a download, a launch or a replay.
    contentApi.onRefused(({ refusal, refs }) => {
        const content = refs.map((ref) => ref.id).join(", ");
        notificationsApi.alert({ text: t(editionLogic.refusalMessageKey(refusal), { content }, refs.length), severity: "error" });
    });
});
</script>

<style lang="scss" scoped>
.notifications {
    position: fixed;
    z-index: 3;
    pointer-events: none;
    align-items: center;
}
.alerts {
    position: fixed;
    top: 105px;
    display: flex;
    flex-direction: column;
}
.events {
    position: fixed;
    right: -2px;
    bottom: -2px;
    gap: 3px;
    display: flex;
    flex-direction: column-reverse;
    pointer-events: auto;
    align-items: flex-end;
}
</style>
