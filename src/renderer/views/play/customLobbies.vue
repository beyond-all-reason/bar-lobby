<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Custom Lobbies", order: 5, devOnly: true, onlineOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-row flex-grow gap-md hide-overflow">
        <!-- ULTRA SIMPLE TEST -->
        <div style="position: fixed; top: 0; left: 0; background: yellow; color: black; padding: 20px; z-index: 9999; font-size: 24px">
            TEMPLATE IS RENDERING! Battles: {{ battles.length }}
        </div>

        <Loader v-if="loading"></Loader>
        <div v-else class="flex-col flex-grow gap-md">
            <div class="flex-row gap-md">
                <h1>{{ t("lobby.multiplayer.custom.title") }}</h1>
            </div>
            <div class="flex-row gap-md">
                <Button class="blue" @click="createLobby" :disabled="isCreating">
                    {{ isCreating ? "Creating..." : t("lobby.multiplayer.custom.hostBattle") }}
                </Button>
                <Checkbox v-model="settingsStore.battlesHidePvE" :label="t('lobby.multiplayer.custom.filters.hidePvE')" />
                <Checkbox v-model="settingsStore.battlesHideLocked" :label="t('lobby.multiplayer.custom.filters.hideLocked')" />
                <Checkbox v-model="settingsStore.battlesHideEmpty" :label="t('lobby.multiplayer.custom.filters.hideEmpty')" />
                <Checkbox v-model="settingsStore.battlesHideInProgress" :label="t('lobby.multiplayer.custom.filters.hideInProgress')" />
                <SearchBox v-model="searchVal" />
            </div>
            <!-- SIMPLE TEST - NO SCROLL CONTAINER -->
            <div style="background: red; color: white; padding: 20px; margin: 20px; font-size: 18px">
                <p>🔴 RED BOX: Battles length: {{ battles.length }}</p>
                <p v-for="(battle, index) in battles" :key="index">
                    Lobby {{ index }}: {{ battle?.name || "Unknown" }} ({{ battle?.playerCount || 0 }}/{{ battle?.maxPlayerCount || 0 }})
                </p>
            </div>

            <div style="background: blue; color: white; padding: 20px; margin: 20px; font-size: 18px">
                <p>🔵 BLUE BOX: Simple v-for test</p>
                <div v-for="(battle, index) in battles" :key="index" style="border: 1px solid white; padding: 10px; margin: 5px">
                    <strong>{{ battle?.name || "Unknown" }}</strong
                    ><br />
                    Map: {{ battle?.mapName || "Unknown" }}<br />
                    Players: {{ battle?.playerCount || 0 }}/{{ battle?.maxPlayerCount || 0 }}<br />
                    ID: {{ battle?.id || "Unknown" }}
                </div>
            </div>
        </div>
        <div v-if="!loading && selectedBattle" class="right">
            <div class="lobby-preview flex-col gap-md">
                <h3>{{ selectedBattle.name }}</h3>
                <div class="lobby-details">
                    <p>
                        <strong>{{ t("lobby.multiplayer.custom.table.map") }}:</strong> {{ selectedBattle.mapName }}
                    </p>
                    <p>
                        <strong>{{ t("lobby.multiplayer.custom.table.players") }}:</strong> {{ selectedBattle.playerCount }}/{{
                            selectedBattle.maxPlayerCount
                        }}
                    </p>
                    <p>
                        <strong>{{ t("lobby.multiplayer.custom.table.engine") }}:</strong> {{ selectedBattle.engineVersion }}
                    </p>
                    <p>
                        <strong>{{ t("lobby.multiplayer.custom.table.game") }}:</strong> {{ selectedBattle.gameVersion }}
                    </p>
                </div>
                <Button class="green flex-grow" @click="attemptJoinBattle(selectedBattle)">{{
                    t("lobby.multiplayer.custom.table.join")
                }}</Button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import account from "@iconify-icons/mdi/account";
import lock from "@iconify-icons/mdi/lock";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { Ref, ref, shallowRef, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";

import Loader from "@renderer/components/common/Loader.vue";
import Button from "@renderer/components/controls/Button.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import SearchBox from "@renderer/components/controls/SearchBox.vue";
import { getFriendlyDuration } from "@renderer/utils/misc";
import { settingsStore } from "@renderer/store/settings.store";
import { useTypedI18n } from "@renderer/i18n";
import { lobbyActions } from "@renderer/store/lobby.store";
import { lobbyListStore, lobbyListActions } from "@renderer/store/lobbyList.store";
import type { LobbyOverview } from "tachyon-protocol/types";

const { t } = useTypedI18n();
const router = useRouter();

const loading = ref(false);
const isCreating = ref(false);
const searchVal = ref("");
const selectedBattle: Ref<LobbyOverview | null> = shallowRef(null);

// Use lobby list from store reactively - use computed for better reactivity
const battles = computed(() => {
    console.log("Computed battles called, store lobbies:", lobbyListStore.lobbies);
    const result = lobbyListStore.lobbies || [];
    console.log("Computed battles returning:", result);
    return result;
});

let lobbyCounter = 1;

// Subscribe to lobby list when component mounts
onMounted(async () => {
    console.log("Component mounted, subscribing to lobby list");
    try {
        // Force refresh the store data first
        lobbyListStore.lobbies = [];
        await lobbyListActions.subscribeToList();
        console.log("Successfully subscribed to lobby list");
    } catch (error) {
        console.error("Failed to subscribe to lobby list:", error);
    }
});

// Unsubscribe when component unmounts
onUnmounted(async () => {
    try {
        await lobbyListActions.unsubscribeFromList();
    } catch (error) {
        console.error("Failed to unsubscribe from lobby list:", error);
    }
});

async function createLobby() {
    isCreating.value = true;

    try {
        // Create lobby with simple defaults
        const response = await window.tachyon.request("lobby/create", {
            name: `Lobby #${lobbyCounter++}`,
            mapName: "Supreme Crossing V1",
            allyTeamConfig: [
                {
                    maxTeams: 1,
                    startBox: { top: 0, bottom: 1, left: 0, right: 0.4 },
                    teams: [{ maxPlayers: 8 }],
                },
                {
                    maxTeams: 1,
                    startBox: { top: 0, bottom: 1, left: 0.6, right: 1 },
                    teams: [{ maxPlayers: 8 }],
                },
            ],
        });

        if (response.status === "success") {
            await lobbyActions.joinLobby(response.data.id);
            await router.push(`/play/custom-lobby/${response.data.id}`);
        }
    } catch (error) {
        console.error("Failed to create lobby:", error);
    } finally {
        isCreating.value = false;
    }
}

async function attemptJoinBattle(battle: LobbyOverview) {
    console.log("Joining lobby", battle);
    try {
        await lobbyActions.joinLobby(battle.id);
        await router.push(`/play/custom-lobby/${battle.id}`);
    } catch (error) {
        console.error("Failed to join lobby:", error);
    }
}
</script>

<style lang="scss" scoped>
.right {
    position: relative;
    min-width: 400px;
    max-width: 400px;
}

.lobby-preview {
    padding: 1rem;
    border: 1px solid var(--surface-border);
    border-radius: 6px;
    background: var(--surface-card);
}

.lobby-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    p {
        margin: 0;
        font-size: 0.9rem;
    }
}

.lobby-table {
    width: 100%;
    border-collapse: collapse;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    overflow: hidden;

    th,
    td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    th {
        background: rgba(255, 255, 255, 0.1);
        font-weight: 600;
        color: var(--color-text);
    }

    .lobby-row {
        cursor: pointer;
        transition: background 0.2s;

        &:hover {
            background: rgba(255, 255, 255, 0.05);
        }
    }
}
</style>
