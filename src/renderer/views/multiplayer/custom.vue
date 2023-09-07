<route lang="json5">
{ meta: { title: "Custom", order: 2, availableOffline: false, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-row flex-grow gap-md hide-overflow">
        <Loader v-if="loading"></Loader>
        <div v-else class="flex-col flex-grow gap-md">
            <div class="flex-row gap-md">
                <h1>Multiplayer Custom Battles</h1>
            </div>

            <div class="flex-row gap-md">
                <Button class="blue" @click="hostBattleOpen = true">Host Battle</Button>
                <HostBattle v-model="hostBattleOpen" />
                <Checkbox v-model="settings.battlesHidePvE" label="Hide PvE" />
                <Checkbox v-model="settings.battlesHideLocked" label="Hide Locked" />
                <Checkbox v-model="settings.battlesHideEmpty" label="Hide Empty" />
                <Checkbox v-model="settings.battlesHideInProgress" label="Hide Running" />
                <SearchBox v-model="searchVal" />
            </div>

            <div class="scroll-container padding-right-sm">
                <DataTable
                    v-model:selection="selectedBattle"
                    :value="battles"
                    autoLayout
                    class="p-datatable-sm"
                    selectionMode="single"
                    :sortOrder="-1"
                    sortField="score"
                    paginator
                    :rows="16"
                    :pageLinkSize="20"
                    @row-select="onRowSelect"
                    @row-dblclick="onDoubleClick"
                >
                    <Column header="Best Battle" sortable sortField="spadsScore.score">
                        <template #body="{ data }">
                            <div
                                v-if="data.spadsScore.primaryFactor !== 'Running'"
                                v-tooltip.right="battleScoreTooltip(data)"
                                class="flex-row flex-center-items gap-md"
                            >
                                {{ data.spadsScore.primaryFactor }}
                            </div>
                            <div
                                v-if="data.spadsScore.primaryFactor === 'Running'"
                                v-tooltip.right="battleScoreTooltip(data)"
                                class="flex-row flex-center-items gap-md"
                            >
                                Running for
                                {{ getFriendlyDuration(data.runtimeMs.value, false) }}
                            </div>
                        </template>
                    </Column>
                    <Column field="battleOptions.title" header="Title" sortable />
                    <Column field="battleOptions.map" header="Map" sortable />
                    <Column header="Players" sortable sortField="playerCount.value">
                        <template #body="{ data }">
                            <div class="flex-row flex-center-items gap-md">
                                <div v-if="data.players.value.length > 0" class="flex-row flex-center-items" style="gap: 2px">
                                    <Icon :icon="account" height="17" />{{ data.players.value.length }}
                                </div>
                                <div v-if="data.spectators.value.length > 0" class="flex-row flex-center-items gap-xs" style="gap: 4px">
                                    <Icon :icon="eye" height="17" />{{ data.spectators.value.length }}
                                </div>
                                <div v-if="data.bots.length > 0" class="flex-row flex-center-items gap-xs" style="gap: 4px">
                                    <Icon :icon="robot" height="17" />{{ data.bots.length }}
                                </div>
                            </div>
                        </template>
                    </Column>
                    <Column headerStyle="width: 0" sortable sortField="isLockedOrPassworded.value">
                        <template #header>
                            <Icon :icon="lock" />
                        </template>
                        <template #body="{ data }">
                            <Icon v-if="data.isLockedOrPassworded.value" :icon="lock" />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>
        <div v-if="!loading" class="right">
            <BattlePreview v-if="selectedBattle" :battle="selectedBattle">
                <template #actions="{ battle }">
                    <template v-if="isSpadsBattle(battle)">
                        <Button class="green flex-grow" @click="attemptJoinBattle(battle)">Join</Button>
                    </template>
                </template>
            </BattlePreview>
        </div>
    </div>
</template>

<script lang="ts" setup>
/**
 * TODO:
 * - Filters
 * - Host custom battle button (should request spawning a dedicated instance instead of being self-hosted)
 * - Host battle modal that includes options such as public/passworded/friends-only/invite-only, title, map, mode etc
 */

import { Icon } from "@iconify/vue";
import account from "@iconify-icons/mdi/account";
import eye from "@iconify-icons/mdi/eye";
import lock from "@iconify-icons/mdi/lock";
import robot from "@iconify-icons/mdi/robot";
import Column from "primevue/column";
import DataTable, { DataTableRowDoubleClickEvent } from "primevue/datatable";
import { computed, onBeforeUnmount, Ref, ref, shallowRef } from "vue";

import BattlePreview from "@/components/battle/BattlePreview.vue";
import HostBattle from "@/components/battle/HostBattle.vue";
import Loader from "@/components/common/Loader.vue";
import Button from "@/components/controls/Button.vue";
import Checkbox from "@/components/controls/Checkbox.vue";
import SearchBox from "@/components/controls/SearchBox.vue";
import { SpadsBattle } from "@/model/battle/spads-battle";
import { attemptJoinBattle } from "@/utils/attempt-join-battle";
import { getFriendlyDuration } from "@/utils/misc";
import { isSpadsBattle } from "@/utils/type-checkers";

const loading = ref(false);
const intervalId = ref(0);
const active = ref(true);
const hostBattleOpen = ref(false);
const searchVal = ref("");
const selectedBattle: Ref<SpadsBattle | null> = shallowRef(null);
const settings = api.settings.model;

const battles = computed(() => {
    let battles = Array.from(api.session.battles.values());

    battles = battles.filter((battle) => {
        if (settings.battlesHideEmpty && battle.users.length === 0) {
            return false;
        }
        if (settings.battlesHideLocked && (battle.battleOptions.locked || battle.battleOptions.passworded)) {
            return false;
        }
        if (settings.battlesHidePvE && battle.bots.length > 0) {
            return false;
        }
        const runtime = battle.runtimeMs.value;
        if (settings.battlesHideInProgress) {
            if (runtime && Number.isInteger(runtime) && runtime > 0) {
                return false;
            }
        }
        if (searchVal.value.length > 0) {
            const searchTerm = searchVal.value.toLowerCase();
            if (battle.battleOptions.title.toLowerCase().includes(searchTerm)) {
                return true;
            }
            if (battle.battleOptions.map.toLowerCase().includes(searchTerm)) {
                return true;
            }
            for (const player of battle.players.value) {
                if (player.username.toLowerCase().includes(searchTerm)) {
                    return true;
                }
            }
            for (const spectator of battle.spectators.value) {
                if (spectator.username.toLowerCase().includes(searchTerm)) {
                    return true;
                }
            }
            return false;
        }

        return true;
    });

    battles.forEach(scoreBattle);

    if (selectedBattle.value === null) {
        // eslint-disable-next-line vue/no-side-effects-in-computed-properties
        selectedBattle.value = battles[0];
    }

    return battles;
});

function battleScoreTooltip(data: SpadsBattle) {
    const scoreExplanation = `\
All Sorting Factors: ${data.spadsScore.score.toFixed(2)}
---
${Object.entries(data.spadsScore.factors)
    .sort(([factorNameA, factorScoreA], [factorNameB, factorScoreB]) => {
        if (factorNameA === data.spadsScore.primaryFactor) {
            return -1;
        }
        if (factorNameB === data.spadsScore.primaryFactor) {
            return 1;
        }
        if (Math.abs(factorScoreA) > Math.abs(factorScoreB)) {
            return -1;
        }
        if (Math.abs(factorScoreA) < Math.abs(factorScoreB)) {
            return 1;
        }

        return 0;
    })
    .map(([factorName, factorScore]) => {
        return `${factorName}: ${factorScore.toFixed(2)}`;
    })
    .join("\n")}
`;

    return scoreExplanation;
}

function scoreBattle(battle: SpadsBattle) {
    battle.clearScore();
    const inBattle = battle.players.value.find((p) => p.userId === api.session.onlineUser?.userId);
    if (inBattle) {
        battle.addScoreFactor("In Lobby", 50);
    }

    if (battle.battleOptions.locked) {
        battle.addScoreFactor("Locked", -9);
    }

    if (battle.battleOptions.passworded) {
        battle.addScoreFactor("Private", -9);
    }

    const runtime = battle.runtimeMs.value || 0;
    let running = runtime > 0;

    // Hardcoded for now, but in the future could be pulled from match type
    const medianRuntime = 1800000; // 30 minutes
    const stdRuntime = 900000; // 15 minutes
    if (runtime > medianRuntime) {
        const runtimeVariance = (runtime - medianRuntime) / stdRuntime;
        battle.addScoreFactor("Ending Soon", Math.log(runtimeVariance + 0.1) * 5);
    }

    if (running) {
        battle.addScoreFactor("Running", -10);
    }

    const playerCount = battle.players.value.length;
    if (!running && playerCount === 0) {
        battle.addScoreFactor("No Players", -15);
    }

    const maxPlayers = battle.battleOptions.maxPlayers;
    const halfOfMaxPlayers = maxPlayers / 2;
    const remainingPlayers = maxPlayers - playerCount;
    if (!running && playerCount > halfOfMaxPlayers && playerCount < maxPlayers) {
        battle.addScoreFactor("Almost full", (-5 / halfOfMaxPlayers) * remainingPlayers + 5);
    }

    const queueSize = battle.battleOptions.joinQueueUserIds?.length || 0;
    if (!running && playerCount >= maxPlayers) {
        battle.addScoreFactor("Full", -1 - queueSize * 0.2);
    }

    // TODO: within skill range
    // TODO: median skill close to won
    // TODO: friend in lobby
    // TODO: blocked in lobby
    // TODO: Highly rated map
    // TODO: Downloaded map

    // TODO: Is a noob lobby and I am noob

    if (!running && playerCount) {
        battle.addScoreFactor("Waiting for players", (1.2 * playerCount) / maxPlayers);
    }

    // Number of spectators
    const nSpectators = battle.spectators.value.length;
    if (nSpectators > 0) {
        battle.addScoreFactor("Spectators", 0.4 * (Math.log(nSpectators + 2) - 1));
    }
}

const watchForLobbyJoin = api.comms.onResponse("s.lobby.updated_client_battlestatus").add(() => {
    loading.value = false;
});

const watchForLobbyJoinFailure = api.comms.onResponse("s.lobby.join").add((data) => {
    if (data.result === "failure" || data.reason === "Battle locked") {
        loading.value = false;
    }
});

onBeforeUnmount(() => {
    watchForLobbyJoin.destroy();
    watchForLobbyJoinFailure.destroy();
    window.clearInterval(intervalId.value);
    active.value = false;
});

await api.session.updateBattleList();

if (active.value) {
    intervalId.value = window.setInterval(api.session.updateBattleList, 5000);
}

function onRowSelect(event: DataTableRowDoubleClickEvent) {
    const data = event.data as SpadsBattle;
    const scoreExplanation = `\
Score explanation for ${data.battleOptions.title}
Primary Factor: ${data.spadsScore.primaryFactor}
Total score: ${data.spadsScore.score}
Factors: ${Object.entries(data.spadsScore.factors).length}
${Object.entries(data.spadsScore.factors)
    .map(([factorName, factorScore]) => {
        return `${factorName.padEnd(20, " ")}: ${factorScore.toFixed(2)}`;
    })
    .join("\n")}
`;

    console.log(scoreExplanation, event.data);
}

async function onDoubleClick(event: DataTableRowDoubleClickEvent) {
    await attemptJoinBattle(event.data);
}
</script>

<style lang="scss" scoped>
.right {
    position: relative;
    min-width: 400px;
    max-width: 400px;
}
</style>
