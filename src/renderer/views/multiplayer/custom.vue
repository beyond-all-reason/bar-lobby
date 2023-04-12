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
                    :autoLayout="true"
                    class="p-datatable-sm"
                    selectionMode="single"
                    :sortOrder="-1"
                    sortField="playerCount.value"
                    @row-dblclick="onDoubleClick"
                >
                    <Column headerStyle="width: 0" sortable sortField="isLockedOrPassworded.value">
                        <template #header>
                            <Icon :icon="lock" />
                        </template>
                        <template #body="{ data }">
                            <Icon v-if="data.isLockedOrPassworded.value" :icon="lock" />
                        </template>
                    </Column>
                    <Column header="Runtime" sortable sortField="runtimeMs.value">
                        <template #body="{ data }">
                            <div v-if="data.runtimeMs.value >= 1">
                                {{ getFriendlyDuration(data.runtimeMs.value) }}
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

        <Modal v-model="passwordPromptOpen" title="Battle Password" @submit="onPasswordPromptSubmit" @open="failureReason = undefined">
            <div class="flex-col gap-md">
                <p>Please enter the password for this battle</p>
                <Textbox type="password" name="password" class="fullwidth" />
                <Button type="submit">Submit</Button>

                <div v-if="failureReason" class="txt-error txt-center">{{ failureReason }}</div>
            </div>
        </Modal>
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
import Modal from "@/components/common/Modal.vue";
import Button from "@/components/controls/Button.vue";
import Checkbox from "@/components/controls/Checkbox.vue";
import SearchBox from "@/components/controls/SearchBox.vue";
import Textbox from "@/components/controls/Textbox.vue";
import { SpadsBattle } from "@/model/battle/spads-battle";
import { getFriendlyDuration } from "@/utils/misc";
import { isSpadsBattle } from "@/utils/type-checkers";

const loading = ref(false);
const hostBattleOpen = ref(false);
const searchVal = ref("");
const selectedBattle: Ref<SpadsBattle | null> = shallowRef(null);
const passwordPromptOpen = ref(false);
const failureReason: Ref<string | undefined> = ref();
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

    if (selectedBattle.value === null) {
        const biggestBattle = battles.sort((a, b) => b.playerCount.value - a.playerCount.value)[0];
        // eslint-disable-next-line vue/no-side-effects-in-computed-properties
        selectedBattle.value = biggestBattle;
    }

    return battles;
});

let intervalId = 0;
let active = true;

const abortController = new AbortController();

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
    abortController.abort();
    window.clearInterval(intervalId);
    active = false;
});

await updateBattleList();

if (active) {
    intervalId = window.setInterval(updateBattleList, 5000);
}

async function updateBattleList() {
    const { lobbies } = await api.comms.request("c.lobby.query", { query: {}, fields: ["lobby", "bots", "modoptions", "member_list"] });

    const userIds: number[] = [];
    for (const battle of lobbies.map((data) => data.lobby)) {
        userIds.push(...battle.players);
        userIds.push(battle.founder_id);
    }

    await api.comms.request("c.user.list_users_from_ids", { id_list: userIds, include_clients: true });

    for (const lobby of lobbies) {
        const battle = api.session.battles.get(lobby.lobby.id);
        if (!battle) {
            api.session.battles.set(lobby.lobby.id, new SpadsBattle(lobby));
        } else {
            battle.handleServerResponse(lobby);
        }
    }

    // clear up dead battles
    const lobbyIds = lobbies.map((lobby) => lobby.lobby.id);
    api.session.battles.forEach((battle) => {
        if (!lobbyIds.includes(battle.battleOptions.id)) {
            api.session.battles.delete(battle.battleOptions.id);
        }
    });
}

async function attemptJoinBattle(battle: SpadsBattle) {
    if (battle.battleOptions.passworded) {
        passwordPromptOpen.value = true;
    } else {
        loading.value = true;
        // if user is in a other lobby, leave it
        if (api.session.onlineBattle.value) {
            await api.comms.request("c.lobby.leave");
        }
        await api.comms.request("c.lobby.join", {
            lobby_id: battle.battleOptions.id,
        });
    }
}

async function onDoubleClick(event: DataTableRowDoubleClickEvent) {
    await attemptJoinBattle(event.data);
}

async function onPasswordPromptSubmit(data) {
    if (!selectedBattle.value) {
        console.warn("Prompting for battle password but no battle selected");
        return;
    }
    loading.value = true;
    const response = await api.comms.request("c.lobby.join", {
        lobby_id: selectedBattle.value.battleOptions.id,
        password: data.password,
    });

    if (response.result === "failure") {
        failureReason.value = response.reason;
        loading.value = false;
    } else {
        passwordPromptOpen.value = false;
    }
}
</script>

<style lang="scss" scoped>
.right {
    position: relative;
    min-width: 400px;
    max-width: 400px;
}
</style>
