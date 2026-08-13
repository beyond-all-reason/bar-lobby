<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Transition name="fade">
        <div v-if="isReconnecting" class="reconnecting-overlay">
            <div class="panel">
                <div class="status">
                    <Loader :absolute-position="false" />
                    <div class="text">{{ t("lobby.navbar.serverStatus.reconnecting") }}</div>
                </div>
                <Button class="slim" @click="playOffline">{{ t("lobby.views.index.playOffline") }}</Button>
            </div>
        </div>
    </Transition>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import Loader from "@renderer/components/common/Loader.vue";
import Button from "@renderer/components/controls/Button.vue";
import { tachyon, tachyonStore } from "@renderer/store/tachyon.store";
import { useTypedI18n } from "@renderer/i18n";

const { t } = useTypedI18n();

const isReconnecting = computed(() => tachyonStore.reconnectInterval !== undefined);

async function playOffline() {
    await tachyon.goOffline();
}
</script>

<style lang="scss" scoped>
// Under the navbar's z-index of 2, so settings, exit and the connection status
// stay reachable. Covering them would take away the way out of this state.
.reconnecting-overlay {
    position: fixed;
    inset: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
}

.panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 30px 40px;
    border-radius: 4px;
    background: rgba(20, 20, 20, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.status {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
}

.text {
    font-size: 18px;
}

// Loader sizes itself with padding because its spinner is absolutely positioned
// off a zero-height box, so this has to stay large enough to contain the 32px
// ball rather than being zeroed out.
:deep(.loader) {
    padding: 16px;
}
</style>
