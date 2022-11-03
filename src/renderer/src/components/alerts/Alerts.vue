<template>
    <div class="fullsize alerts">
        <TransitionGroup name="list" class="notifications" tag="div">
            <Notification v-for="notification in notifications" :key="notification.id" :notification="notification" />
        </TransitionGroup>
        <div class="events">
            <Event v-for="(event, i) in events" :key="i" :event="event" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import Event from "@/components/alerts/Event.vue";
import Notification from "@/components/alerts/Notification.vue";
import { EventAlert, NotificationAlert } from "$/model/alert";

const alerts = api.alerts.alerts;

const notifications = computed(() => alerts.filter((alert): alert is NotificationAlert => alert.type === "notification"));
const events = computed(() => alerts.filter((alert): alert is EventAlert => alert.type === "event"));
</script>

<style lang="scss" scoped>
.alerts {
    position: fixed;
    z-index: 5;
    pointer-events: none;
    align-items: center;
    z-index: 15;
}
.events {
    position: fixed;
    right: 5px;
    bottom: 5px;
    gap: 5px;
    flex-direction: column-reverse;
    pointer-events: auto;
    align-items: flex-end;
}
.notifications {
    position: fixed;
    top: 130px;
    display: flex;
    flex-direction: column;
}
</style>
