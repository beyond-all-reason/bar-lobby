<route lang="json5">
{ meta: { title: "Custom", order: 2, devOnly: true, onlineOnly: true, transition: { name: "slide-left" } } }
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
                <Checkbox v-model="settingsStore.battlesHidePvE" label="Hide PvE" />
                <Checkbox v-model="settingsStore.battlesHideLocked" label="Hide Locked" />
                <Checkbox v-model="settingsStore.battlesHideEmpty" label="Hide Empty" />
                <Checkbox v-model="settingsStore.battlesHideInProgress" label="Hide Running" />
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
                    @row-select="selectedBattle = $event.data"
                    @row-dblclick="attemptJoinBattle($event.data)"
                >
                    <Column header="Best Battle" sortable sortField="score">
                        <template #body="{ data }">
                            <div v-if="data.primaryFactor !== 'Running'" class="flex-row flex-center-items gap-md">
                                {{ data.primaryFactor }}
                            </div>
                            <div v-if="data.primaryFactor === 'Running'" class="flex-row flex-center-items gap-md">
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
                    <Button class="green flex-grow" @click="attemptJoinBattle(battle)">Join</Button>
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
import DataTable from "primevue/datatable";
import { Ref, ref, shallowRef } from "vue";

import BattlePreview from "@renderer/components/battle/BattlePreview.vue";
import HostBattle from "@renderer/components/battle/HostBattle.vue";
import Loader from "@renderer/components/common/Loader.vue";
import Button from "@renderer/components/controls/Button.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import SearchBox from "@renderer/components/controls/SearchBox.vue";
import { getFriendlyDuration } from "@renderer/utils/misc";
import { OngoingBattle } from "@main/content/replays/replay";
import { settingsStore } from "@renderer/store/settings.store";

const loading = ref(false);
const hostBattleOpen = ref(false);
const searchVal = ref("");
const selectedBattle: Ref<OngoingBattle | null> = shallowRef(null);

//TODO uses dexie to retrieve known battles and to filter them, check how its done in the replays
const battles = [] as OngoingBattle[];

function attemptJoinBattle(battle: OngoingBattle) {
    console.log("Joining battle", battle);
}
</script>

<style lang="scss" scoped>
.right {
    position: relative;
    min-width: 400px;
    max-width: 400px;
}
</style>
