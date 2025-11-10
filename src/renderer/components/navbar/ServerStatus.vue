<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Button @click="handleClick">
        <div class="flex-row flex-center gap-sm">
            <div class="server-status-dot" :class="statusClass">⬤</div>
            <div>{{ statusText }}</div>
        </div>
    </Button>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import Button from "@renderer/components/controls/Button.vue";
import { tachyonStore } from "@renderer/store/tachyon.store";
import { me } from "@renderer/store/me.store";
import { useTypedI18n } from "@renderer/i18n";
import { useLogInConfirmation } from "@renderer/composables/useLogInConfirmation";

const { t } = useTypedI18n();
const router = useRouter();
const { openLogInConfirmation } = useLogInConfirmation();

const statusClass = computed(() => {
    if (!me.isAuthenticated) return "";
    return tachyonStore.isConnected ? "online" : "offline";
});

const statusText = computed(() => {
    if (!me.isAuthenticated) {
        return t("lobby.navbar.serverStatus.offline");
    }

    if (tachyonStore.isConnected) {
        const userCount = tachyonStore.serverStats?.userCount || 0;
        return `${userCount} ${t("lobby.navbar.serverStatus.playersOnline")}`;
    }

    if (tachyonStore.error) {
        return t("lobby.navbar.serverStatus.error");
    }

    return t("lobby.navbar.serverStatus.reconnecting");
});

function handleClick() {
    if (!me.isAuthenticated) {
        openLogInConfirmation(router.currentRoute.value);
    }
}
</script>

<style lang="scss" scoped>
.server-status-dot {
    font-size: 12px;
    margin-right: 4px;

    &.online {
        color: rgb(121, 226, 0);
    }

    &.offline {
        color: rgb(216, 46, 46);
    }
}
</style>
