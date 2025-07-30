<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Button>
        <div class="flex-row flex-center gap-sm">
            <div class="server-status-dot" :class="{ offline: !tachyonStore.isConnected }">⬤</div>
            <div v-if="tachyonStore.isConnected">
                {{ tachyonStore.serverStats?.userCount || 0 }} {{ t("lobby.navbar.serverStatus.playersOnline") }}
            </div>
            <div v-else-if="tachyonStore.error">{{ t("lobby.navbar.serverStatus.error") }}</div>
            <div v-else>{{ t("lobby.navbar.serverStatus.reconnecting") }}</div>
        </div>
    </Button>
</template>
<script lang="ts" setup>
import Button from "@renderer/components/controls/Button.vue";
import { tachyonStore } from "@renderer/store/tachyon.store";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();
</script>
<style lang="scss" scoped>
.server-status-dot {
    font-size: 12px;
    margin-right: 4px;
    color: rgb(121, 226, 0);
    &.offline {
        color: rgb(216, 46, 46);
    }
}
</style>
