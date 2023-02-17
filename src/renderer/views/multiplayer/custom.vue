<route lang="json5">
{ meta: { title: "Custom", order: 2, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-row flex-grow gap-md hide-overflow">
        <div class="flex-col flex-grow gap-md">
            <div class="flex-row gap-md">
                <h1>Multiplayer Custom Battles</h1>
            </div>

            <div class="flex-row gap-md">
                <Button class="blue" @click="hostBattleOpen = true">Host Battle</Button>
                <HostBattle v-model="hostBattleOpen" />
                <Checkbox v-model="hidePvE" label="Hide PvE" />
                <Checkbox v-model="hideLocked" label="Hide Locked" />
                <Checkbox v-model="hideEmpty" label="Hide Empty" />
            </div>

            <div class="battlelist">
                <DataTable
                    v-model:selection="selectedBattle"
                    :value="battles"
                    :autoLayout="true"
                    class="p-datatable-sm"
                    selectionMode="single"
                    :sortOrder="-1"
                    sortField="playerCount.value"
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
        <div class="right">
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
import { delay } from "jaz-ts-utils";
import Column from "primevue/column";
import { computed, onUnmounted, Ref, ref, shallowRef } from "vue";

import BattlePreview from "@/components/battle/BattlePreview.vue";
import HostBattle from "@/components/battle/HostBattle.vue";
import Modal from "@/components/common/Modal.vue";
import Button from "@/components/controls/Button.vue";
import Checkbox from "@/components/controls/Checkbox.vue";
import DataTable from "@/components/controls/DataTable.vue";
import Textbox from "@/components/controls/Textbox.vue";
import { SpadsBattle } from "@/model/battle/spads-battle";
import { getFriendlyDuration } from "@/utils/misc";
import { isSpadsBattle } from "@/utils/type-checkers";

const hostBattleOpen = ref(false);
const hidePvE = ref(false);
const hideLocked = ref(false);
const hideEmpty = ref(true);
const selectedBattle: Ref<SpadsBattle | null> = shallowRef(null);
const passwordPromptOpen = ref(false);
const failureReason: Ref<string | undefined> = ref();
const battles = computed(() => {
    let battles = Array.from(api.session.battles.values());

    battles = battles.filter((battle) => {
        if (hidePvE.value && battle.bots.length > 0) {
            return false;
        }
        if (hideLocked.value && (battle.battleOptions.locked || battle.battleOptions.passworded)) {
            return false;
        }
        if (hideEmpty.value && battle.users.length === 0) {
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

await updateBattleList();

await delay(500);

const intervalId = window.setInterval(updateBattleList, 5000);

onUnmounted(() => {
    console.log("unmount");
    window.clearInterval(intervalId);
});

async function updateBattleList() {
    console.log("update");
    // this prevents polling for updates if the user isn't looking at the battle list
    // commented out for now because the host battle functionality also depends on this to know when the battle is created
    // if (document.visibilityState === "hidden") {
    //     return;
    // }
    const { lobbies } = await api.comms.request("c.lobby.query", { query: {}, fields: ["lobby", "bots", "modoptions", "member_list"] });

    const userIds: number[] = [];
    for (const battle of lobbies.map((data) => data.lobby)) {
        userIds.push(...battle.players);
        userIds.push(battle.founder_id);
    }

    await api.comms.request("c.user.list_users_from_ids", { id_list: userIds, include_clients: true });

    for (const lobby of lobbies) {
        let battle = api.session.battles.get(lobby.lobby.id);
        if (!battle) {
            api.session.battles.set(lobby.lobby.id, new SpadsBattle(lobby));
        } else {
            battle.handleServerResponse(lobby);
        }
    }
}

async function attemptJoinBattle(battle: SpadsBattle) {
    if (battle.battleOptions.passworded) {
        passwordPromptOpen.value = true;
    } else {
        await api.comms.request("c.lobby.join", {
            lobby_id: battle.battleOptions.id,
        });
    }
}

async function onPasswordPromptSubmit(data) {
    if (!selectedBattle.value) {
        console.warn("Prompting for battle password but no battle selected");
        return;
    }

    const response = await api.comms.request("c.lobby.join", {
        lobby_id: selectedBattle.value.battleOptions.id,
        password: data.password,
    });

    if (response.result === "failure") {
        failureReason.value = response.reason;
    } else {
        passwordPromptOpen.value = false;
    }
}
</script>

<style lang="scss" scoped>
.battlelist {
    flex: 1 1 auto;
    overflow-y: auto;
    height: 0px;
}
.right {
    position: relative;
    width: 400px;
}
</style>
