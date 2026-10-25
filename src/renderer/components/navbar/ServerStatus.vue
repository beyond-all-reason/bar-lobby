<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="status-anchor" v-click-away:serverStatus="() => (menuOpen = false)">
        <Button :title="buttonTitle" @click="handleClick">
            <div class="flex-row flex-center gap-sm">
                <div class="server-status-dot" :class="statusClass">⬤</div>
                <div>{{ statusText }}</div>
            </div>
        </Button>

        <div v-if="menuOpen" class="status-menu flex-col">
            <Button :class="{ current: currentStatus === 'online' }" @click="chooseOnline">
                <div class="flex-row flex-center gap-sm">
                    <div class="server-status-dot online">⬤</div>
                    <div>{{ t("lobby.navbar.serverStatus.statusOnline") }}</div>
                </div>
            </Button>
            <Button :disabled="true" :title="t('lobby.navbar.serverStatus.statusBusyUnavailable')">
                <div class="flex-row flex-center gap-sm">
                    <div class="server-status-dot busy">⬤</div>
                    <div>{{ t("lobby.navbar.serverStatus.statusBusy") }}</div>
                </div>
            </Button>
            <Button :class="{ current: currentStatus === 'offline' }" @click="chooseOffline">
                <div class="flex-row flex-center gap-sm">
                    <div class="server-status-dot offline">⬤</div>
                    <div>{{ t("lobby.navbar.serverStatus.goOffline") }}</div>
                </div>
            </Button>
        </div>
    </div>

    <Modal v-if="confirming" v-model="confirmOpen" :title="t(`lobby.navbar.serverStatus.${confirming}Title`)">
        <div class="confirm flex-col gap-md">
            <div>{{ t(`lobby.navbar.serverStatus.${confirming}Body`) }}</div>
            <div class="flex-row gap-md">
                <Button class="fullwidth" @click="confirming = undefined">{{ t("lobby.navbar.serverStatus.cancel") }}</Button>
                <Button class="fullwidth red" @click="confirmAction">{{ t(`lobby.navbar.serverStatus.${confirming}`) }}</Button>
            </div>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "@renderer/components/controls/Button.vue";
import Modal from "@renderer/components/common/Modal.vue";
import { tachyon, tachyonStore } from "@renderer/store/tachyon.store";
import { auth, me } from "@renderer/store/me.store";
import { useTypedI18n } from "@renderer/i18n";
import { useLogInConfirmation } from "@renderer/composables/useLogInConfirmation";

const { t } = useTypedI18n();
const router = useRouter();
const { openLogInConfirmation } = useLogInConfirmation();

type ServerAction = "connect" | "disconnect" | "stopReconnecting";

// Captured when the modal opens rather than read live. The connection can change
// while the modal sits there, and the user has to get the action they were shown.
const confirming = ref<ServerAction>();

const confirmOpen = computed({
    get: () => confirming.value !== undefined,
    set: (open: boolean) => {
        if (!open) confirming.value = undefined;
    },
});

// Retrying is only knowable from the timer. Deriving it from "not connected"
// reports attempts that aren't happening, and tachyonStore.error can't stand in
// for a state either: it is set by the first failed attempt and by server stats
// requests alike, so it says nothing about whether we are still trying.
const isReconnecting = computed(() => tachyonStore.reconnectInterval !== undefined);

const statusClass = computed(() => {
    if (!me.isAuthenticated) return "";
    return tachyonStore.isConnected ? "online" : "offline";
});

const statusText = computed(() => {
    if (!me.isAuthenticated) return t("lobby.navbar.serverStatus.offline");

    if (tachyonStore.isConnected) {
        const userCount = tachyonStore.serverStats?.userCount || 0;
        return `${userCount} ${t("lobby.navbar.serverStatus.playersOnline")}`;
    }

    if (isReconnecting.value) return t("lobby.navbar.serverStatus.reconnecting");

    return t("lobby.navbar.serverStatus.offline");
});

const pendingAction = computed<ServerAction | undefined>(() => {
    if (!me.isAuthenticated) return undefined;
    if (tachyonStore.isConnected) return "disconnect";

    return isReconnecting.value ? "stopReconnecting" : "connect";
});

const menuOpen = ref(false);

// Which of the menu entries describes where we are right now. This follows what
// the user asked for rather than whether the socket happens to be up, so a drop
// they did not choose keeps them on Online while we retry. Busy is never it,
// since the server has no way to represent it.
const currentStatus = computed(() => (tachyonStore.wantsConnection ? "online" : "offline"));

const buttonTitle = computed(() => tachyonStore.error ?? t("lobby.navbar.serverStatus.changeStatus"));

function handleClick() {
    if (!me.isAuthenticated) {
        openLogInConfirmation(router.currentRoute.value);
        return;
    }

    menuOpen.value = !menuOpen.value;
}

function chooseOnline() {
    menuOpen.value = false;
    if (tachyonStore.isConnected) return;

    // Reconnecting already leads here, so there is nothing to confirm.
    void runAction("connect");
}

// Leaving is disruptive enough that a stray click shouldn't do it, so this one
// goes through the confirmation rather than acting immediately.
function chooseOffline() {
    menuOpen.value = false;
    confirming.value = pendingAction.value;
}

function confirmAction() {
    const action = confirming.value;
    confirming.value = undefined;

    void runAction(action);
}

async function runAction(action: ServerAction | undefined) {
    try {
        if (action === "connect") await auth.goOnline();
        if (action === "disconnect" || action === "stopReconnecting") await tachyon.goOffline();
    } catch (error) {
        // Surfaced through the status itself; there is nowhere better to put it.
        console.error(`Could not ${action}`, error);
    }
}
</script>

<style lang="scss" scoped>
.confirm {
    width: 352px;
}

.status-anchor {
    position: relative;
}

.status-menu {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 20;
    min-width: 100%;
    white-space: nowrap;
    background: #111;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.5);

    // Button's own active prop applies a class that nothing styles, so the
    // current entry is marked here instead.
    .current {
        background-color: rgba(255, 255, 255, 0.25);
        font-weight: bold;
    }
}

.server-status-dot {
    font-size: 12px;
    margin-right: 4px;

    &.online {
        color: rgb(121, 226, 0);
    }

    &.busy {
        color: rgb(226, 170, 0);
    }

    &.offline {
        color: rgb(216, 46, 46);
    }
}
</style>
