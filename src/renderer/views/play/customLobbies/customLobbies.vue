<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Custom Lobbies", order: 5, devOnly: true, onlineOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-row flex-grow gap-md hide-overflow fullheight">
        <Loader v-if="loading"></Loader>
        <div v-else class="flex-col flex-grow gap-md fullheight margin-left-md margin-right-md">
            <div class="flex-row gap-md">
                <h1>{{ t("lobby.multiplayer.custom.title") }}</h1>
            </div>
            <div class="flex-row gap-md flex-top">
                <Button class="blue" @click="createLobbyModalIsOpen = true">{{ t("lobby.multiplayer.custom.hostBattle") }}</Button>
                <HostBattle v-model="createLobbyModalIsOpen" />
                <LeaveConfirmModal
                    v-model="leaveConfirmModalIsOpen"
                    @cancel-leave="leaveConfirmModalIsOpen = false"
                    @confirm-leave="leaveLobby()"
                />
                <Checkbox v-model="settingsStore.battlesHidePvE" :label="t('lobby.multiplayer.custom.filters.hidePvE')" />
                <Checkbox v-model="settingsStore.battlesHideLocked" :label="t('lobby.multiplayer.custom.filters.hideLocked')" />
                <Checkbox v-model="settingsStore.battlesHideEmpty" :label="t('lobby.multiplayer.custom.filters.hideEmpty')" />
                <Checkbox v-model="settingsStore.battlesHideInProgress" :label="t('lobby.multiplayer.custom.filters.hideInProgress')" />
                <SearchBox v-model="searchVal" />
                <Button v-if="settingsStore.devMode" @click="router.push('/play/customLobbies/lobby')">Dev Lobby View</Button>
            </div>
            <div class="flex-col flex-grow fullheight flex-top">
                <div class="scroll-container padding-right-sm">
                    <DataTable
                        v-model:selection="tachyonStore.selectedLobby"
                        :value="lobbyList"
                        data-key="id"
                        autoLayout
                        class="p-datatable-sm"
                        selectionMode="single"
                        :sortOrder="-1"
                        sortField="score"
                        paginator
                        :rows="16"
                        :pageLinkSize="20"
                        @row-select="tachyonStore.selectedLobby = $event.data"
                        @row-dblclick="sendLobbyJoinRequest($event.data)"
                    >
                        <Column field="name" :header="t('lobby.multiplayer.custom.table.title')" sortable />
                        <Column field="mapName" :header="t('lobby.multiplayer.custom.table.map')" sortable />
                        <Column :header="t('lobby.multiplayer.custom.table.players')" sortable sortField="playerCount.value">
                            <template #body="{ data }">
                                <div class="flex-row flex-center-items gap-md">
                                    <div v-if="data.playerCount > 0" class="flex-row flex-center-items" style="gap: 2px">
                                        <Icon :icon="account" height="17" />{{ data.playerCount }}/{{ data.maxPlayerCount }}
                                    </div>
                                    <div v-if="true" class="flex-row flex-center-items gap-xs" style="gap: 4px">
                                        <Icon :icon="eye" height="17" />{{ 0 }}
                                    </div>
                                    <div v-if="true" class="flex-row flex-center-items gap-xs" style="gap: 4px">
                                        <Icon :icon="robot" height="17" />{{ 0 }}
                                    </div>
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </div>
        </div>
        <div v-if="!loading" class="right">
            <div class="flex flex-col">
                <Button
                    v-if="tachyonStore.activeLobby == undefined"
                    class="green flex-grow margin-top-lg margin-bottom-lg"
                    @click="sendLobbyJoinRequest(tachyonStore.selectedLobby)"
                    :disabled="tachyonStore.selectedLobby == undefined"
                    >{{ t("lobby.multiplayer.custom.table.join") }}</Button
                >
                <Button v-else class="green flex-grow margin-top-lg margin-bottom-lg" @click="battleStore.isLobbyOpened = true">
                    Open Current Lobby
                </Button>
                <LobbyPreview v-if="tachyonStore.selectedLobby" :lobby="tachyonStore.selectedLobby"></LobbyPreview>
            </div>
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
import { Ref, ref, shallowRef, computed, onActivated } from "vue";
//import BattlePreview from "@renderer/components/battle/BattlePreview.vue";
import HostBattle from "@renderer/components/battle/HostBattle.vue";
import Loader from "@renderer/components/common/Loader.vue";
import Button from "@renderer/components/controls/Button.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import SearchBox from "@renderer/components/controls/SearchBox.vue";
import { getFriendlyDuration } from "@renderer/utils/misc";
import { OngoingBattle } from "@main/content/replays/replay";
import { settingsStore } from "@renderer/store/settings.store";
import { useTypedI18n } from "@renderer/i18n";
import { tachyon, tachyonStore } from "@renderer/store/tachyon.store";
import { Lobby as LobbyType } from "@renderer/model/lobby";
import LobbyPreview from "@renderer/components/battle/LobbyPreview.vue";
import { router } from "@renderer/router";
import { battleStore } from "@renderer/store/battle.store";
import LeaveConfirmModal from "@renderer/components/battle/LeaveConfirmModal.vue";

const { t } = useTypedI18n();

const loading = ref(false);
//const hostBattleOpen = ref(false);
const createLobbyModalIsOpen = ref(false);
const leaveConfirmModalIsOpen = ref(false);
const searchVal = ref("");
//const selectedBattle: Ref<OngoingBattle | null> = shallowRef(null);
//const selectedLobby: Ref<LobbyType | null> = shallowRef(null); //FIXME: There are cases where we want to clear this value back to null. Especially if the lobby is removed from the list by the server.
const lobbyList = computed(() => {
    const arr: LobbyType[] = [];
    for (const lobbyKey in tachyonStore.lobbyList) {
        const item = tachyonStore.lobbyList[lobbyKey];
        arr.push(item);
    }
    return arr;
});

//NOTE: the lobby list is now stored in tachyonStore.lobbies instead.
//TODO uses dexie to retrieve known battles and to filter them, check how its done in the replays
//const battles = [] as OngoingBattle[];

/*
function attemptJoinBattle(battle: OngoingBattle) {
    console.log("Joining battle", battle);
}
*/
function leaveLobby() {
    leaveConfirmModalIsOpen.value = false;
    tachyon.leaveLobby();
}
function sendLobbyJoinRequest(data) {
    //Data here is the entire selectedLobby object (e.g. one of the lobbyList[] items)
    if (tachyonStore.activeLobby) {
        leaveConfirmModalIsOpen.value = true;
        //TODO: Pass the new ID through so we can try to auto-join after confirming.
    } else tachyon.joinLobby({ id: data.id });
}

// Just in case we need to manually request a subscribe event for some reason.
function sendLobbyListSubscribeRequest() {
    tachyon.subscribeList();
}

// Just in case we need to manually request an unsubscribe event for some reason.
function sendLobbyListUnsubscribeRequest() {
    tachyon.unsubscribeList();
}

// Because this page is part of <KeepAlive>, we use this instead of onMounted() to trigger anytime the page is loaded.
onActivated(() => {
    //Subscribe to the lobby list when this page is loaded
    tachyon.subscribeList();
});
</script>

<style lang="scss" scoped>
.right {
    position: relative;
    min-width: 400px;
    max-width: 400px;
}
</style>
