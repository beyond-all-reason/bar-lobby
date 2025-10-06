<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{
    path: "/play/custom-lobby/:id",
    meta: { title: "Custom Lobby", transition: { name: "slide-left" }, onlineOnly: true },
}
</route>

<template>
    <div class="custom-lobby flex-col flex-grow gap-md">
        <Loader v-if="!lobbyStore.currentLobby"></Loader>

        <template v-else>
            <!-- Header with lobby info -->
            <div class="lobby-header flex-row gap-md flex-space-between">
                <div class="flex-col">
                    <h2>{{ lobbyStore.currentLobby.name }}</h2>
                    <div class="lobby-map">Map: {{ lobbyStore.currentLobby.mapName }}</div>
                </div>
                <div class="flex-row gap-md">
                    <Button class="red" @click="leaveLobby">{{ t("lobby.customLobby.leave") }}</Button>
                    <Button v-if="lobbyStore.isBoss" class="green" :disabled="!canStartBattle" @click="startBattle">
                        {{ t("lobby.customLobby.start") }}
                    </Button>
                </div>
            </div>

            <div class="lobby-content flex-row gap-md flex-grow">
                <!-- Left side: Players and Teams -->
                <div class="players-section flex-col gap-md flex-grow">
                    <LobbyPlayerList />
                </div>

                <!-- Right side: Mods and Settings -->
                <div class="settings-section flex-col gap-md">
                    <LobbyModList />
                </div>
            </div>
        </template>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useTypedI18n } from "@renderer/i18n";

import Loader from "@renderer/components/common/Loader.vue";
import Button from "@renderer/components/controls/Button.vue";
import LobbyPlayerList from "@renderer/components/battle/LobbyPlayerList.vue";
import LobbyModList from "@renderer/components/battle/LobbyModList.vue";
import { lobbyStore, lobbyActions } from "@renderer/store/lobby.store";
import { useLobbySync } from "@renderer/composables/useLobbySync";

const { t } = useTypedI18n();
const router = useRouter();
const route = useRoute();

// Track sync status
const { isFullySynced } = useLobbySync();

const canStartBattle = computed(() => {
    if (!lobbyStore.currentLobby) return false;

    // Check that all players are synced
    const allPlayersSynced = Object.values(lobbyStore.currentLobby.members).every((member) => {
        if (member.type === "spec") return true; // Spectators don't need to be synced
        if (!member.sync) return false;
        return member.sync.map && member.sync.engine && member.sync.game;
    });

    return allPlayersSynced && isFullySynced.value;
});

async function leaveLobby() {
    await lobbyActions.leaveLobby();
    await router.push("/play/custom-lobbies");
}

async function startBattle() {
    if (!lobbyStore.currentLobby || !lobbyStore.isBoss) return;

    try {
        await window.tachyon.request("lobby/startBattle", {
            lobbyId: lobbyStore.currentLobby.id,
        });
    } catch (error) {
        console.error("Failed to start battle:", error);
    }
}

onMounted(async () => {
    const lobbyId = route.params.id as string;

    // If we're not in this lobby yet, join it
    if (!lobbyStore.currentLobby || lobbyStore.currentLobby.id !== lobbyId) {
        try {
            await lobbyActions.joinLobby(lobbyId);
        } catch (error) {
            console.error("Failed to join lobby:", error);
            await router.push("/play/custom-lobbies");
        }
    }
});

onUnmounted(() => {
    // Don't automatically leave when unmounting - user might navigate away temporarily
});
</script>

<style lang="scss" scoped>
.custom-lobby {
    padding: 20px;
    height: 100%;
}

.lobby-header {
    padding: 16px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
}

.lobby-map {
    color: var(--color-text-secondary);
    font-size: 0.9em;
    margin-top: 4px;
}

.lobby-content {
    overflow: hidden;
}

.players-section {
    min-width: 400px;
    overflow-y: auto;
}

.settings-section {
    min-width: 300px;
    max-width: 400px;
}
</style>
