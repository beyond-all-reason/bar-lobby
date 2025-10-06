<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="lobby-player-list flex-col gap-md">
        <h3>{{ t("lobby.components.playerlist.players") }}</h3>

        <div v-if="!lobbyStore.currentLobby" class="no-lobby">No lobby</div>

        <div v-else class="teams-container flex-col gap-md">
            <!-- Group players by ally team -->
            <div v-for="(allyTeam, allyIndex) in allyTeams" :key="allyIndex" class="ally-team">
                <div class="ally-team-header">
                    <Icon :icon="shieldIcon" />
                    {{ t("lobby.customLobby.allyTeam", { number: allyIndex + 1 }) }}
                </div>

                <!-- Players in this ally team -->
                <div class="players-list flex-col gap-sm">
                    <div
                        v-for="member in allyTeam.members"
                        :key="member.id"
                        class="player-item flex-row gap-md flex-space-between"
                        :class="{ 'is-boss': member.id === lobbyStore.currentLobby.bossId }"
                    >
                        <div class="player-info flex-row gap-md">
                            <Icon v-if="member.type === 'ai'" :icon="robotIcon" />
                            <Icon v-else :icon="accountIcon" />

                            <span class="player-name">{{ member.player || member.id }}</span>

                            <span v-if="member.id === lobbyStore.currentLobby.bossId" class="boss-badge">
                                {{ t("lobby.customLobby.boss") }}
                            </span>

                            <span v-if="member.type === 'player'" class="team-badge"> Team {{ member.team }} </span>
                        </div>

                        <!-- Sync status for players (not AIs) -->
                        <div v-if="member.type === 'player' && member.sync" class="sync-status flex-row gap-xs">
                            <Icon
                                :icon="member.sync.map ? checkIcon : closeIcon"
                                :class="member.sync.map ? 'synced' : 'not-synced'"
                                title="Map"
                            />
                            <Icon
                                :icon="member.sync.engine ? checkIcon : closeIcon"
                                :class="member.sync.engine ? 'synced' : 'not-synced'"
                                title="Engine"
                            />
                            <Icon
                                :icon="member.sync.game ? checkIcon : closeIcon"
                                :class="member.sync.game ? 'synced' : 'not-synced'"
                                title="Game"
                            />
                            <Icon :icon="getModSyncIcon(member.sync)" :class="getModSyncClass(member.sync)" title="Mods" />
                        </div>

                        <!-- Spectator indication -->
                        <div v-else-if="member.type === 'spec'" class="spectator-badge">Spectator</div>
                    </div>
                </div>
            </div>

            <!-- Spectators section -->
            <div v-if="spectators.length > 0" class="spectators-section">
                <div class="spectators-header">
                    <Icon :icon="eyeIcon" />
                    {{ t("lobby.components.playerlist.spectators") }}
                </div>

                <div class="players-list flex-col gap-sm">
                    <div v-for="spec in spectators" :key="spec.id" class="player-item flex-row gap-md flex-space-between">
                        <div class="player-info flex-row gap-md">
                            <Icon :icon="eyeIcon" />
                            <span class="player-name">{{ spec.player || spec.id }}</span>
                        </div>

                        <div v-if="spec.sync" class="sync-status flex-row gap-xs">
                            <Icon
                                :icon="spec.sync.map ? checkIcon : closeIcon"
                                :class="spec.sync.map ? 'synced' : 'not-synced'"
                                title="Map"
                            />
                            <Icon
                                :icon="spec.sync.engine ? checkIcon : closeIcon"
                                :class="spec.sync.engine ? 'synced' : 'not-synced'"
                                title="Engine"
                            />
                            <Icon
                                :icon="spec.sync.game ? checkIcon : closeIcon"
                                :class="spec.sync.game ? 'synced' : 'not-synced'"
                                title="Game"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import accountIcon from "@iconify-icons/mdi/account";
import robotIcon from "@iconify-icons/mdi/robot";
import shieldIcon from "@iconify-icons/mdi/shield";
import eyeIcon from "@iconify-icons/mdi/eye";
import checkIcon from "@iconify-icons/mdi/check-circle";
import closeIcon from "@iconify-icons/mdi/close-circle";
import { useTypedI18n } from "@renderer/i18n";

import { lobbyStore } from "@renderer/store/lobby.store";
import type { MemberSyncStatus } from "tachyon-protocol/types";

const { t } = useTypedI18n();

// Group members by ally team
const allyTeams = computed(() => {
    if (!lobbyStore.currentLobby) return [];

    const teams: Record<string, any[]> = {};

    Object.values(lobbyStore.currentLobby.members).forEach((member) => {
        if (member.type !== "spec") {
            const allyTeam = member.ally || "0";
            if (!teams[allyTeam]) {
                teams[allyTeam] = [];
            }
            teams[allyTeam].push(member);
        }
    });

    return Object.entries(teams).map(([allyId, members]) => ({
        allyId,
        members,
    }));
});

const spectators = computed(() => {
    if (!lobbyStore.currentLobby) return [];

    return Object.values(lobbyStore.currentLobby.members).filter((member) => member.type === "spec");
});

function getModSyncIcon(sync: MemberSyncStatus) {
    const requiredMods = lobbyStore.currentLobby?.mods || [];
    if (requiredMods.length === 0) return checkIcon;

    const hasMods = sync.mods && sync.mods.length === requiredMods.length;
    return hasMods ? checkIcon : closeIcon;
}

function getModSyncClass(sync: MemberSyncStatus) {
    const requiredMods = lobbyStore.currentLobby?.mods || [];
    if (requiredMods.length === 0) return "synced";

    const hasMods = sync.mods && sync.mods.length === requiredMods.length;
    return hasMods ? "synced" : "not-synced";
}
</script>

<style lang="scss" scoped>
.lobby-player-list {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 16px;
}

.teams-container {
    max-height: 600px;
    overflow-y: auto;
}

.ally-team {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    padding: 12px;
}

.ally-team-header {
    font-weight: 600;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-primary);
}

.spectators-section {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    padding: 12px;
}

.spectators-header {
    font-weight: 600;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-text-secondary);
}

.players-list {
    padding-left: 8px;
}

.player-item {
    padding: 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    align-items: center;

    &.is-boss {
        border: 1px solid var(--color-primary);
    }
}

.player-info {
    align-items: center;
    flex: 1;
}

.player-name {
    font-weight: 500;
}

.boss-badge {
    background: var(--color-primary);
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75em;
    font-weight: 600;
}

.team-badge {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75em;
}

.spectator-badge {
    color: var(--color-text-secondary);
    font-size: 0.85em;
}

.sync-status {
    align-items: center;

    :deep(svg) {
        width: 18px;
        height: 18px;

        &.synced {
            color: var(--color-success);
        }

        &.not-synced {
            color: var(--color-error);
        }
    }
}

.no-lobby {
    text-align: center;
    padding: 32px;
    color: var(--color-text-secondary);
}
</style>
