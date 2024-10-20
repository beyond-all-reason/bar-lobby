<template>
    <div class="fullsize notifications">
        <TransitionGroup name="list" class="alerts" tag="div">
            <Alert v-for="notification in notifications.alerts" :key="notification.id" :alert="notification" />
        </TransitionGroup>
        <TransitionGroup name="list" class="events" tag="div">
            <Event v-for="event in notifications.events" :key="event.id" :event="event" />
        </TransitionGroup>
    </div>
</template>

<script lang="ts" setup>
import Alert from "@renderer/components/notifications/Alert.vue";
import Event from "@renderer/components/notifications/Event.vue";

const notifications = api.notifications;
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
