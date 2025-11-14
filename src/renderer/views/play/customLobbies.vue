<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Custom Lobbies", order: 5, devOnly: false, onlineOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="flex-row flex-grow gap-md hide-overflow fullheight">
            <Loader v-if="loading || !tachyonStore.isConnected"></Loader>
            <div v-else class="flex-row flex-grow fullheight">
                <div class="flex-col flex-grow gap-md fullheight margin-left-lg">
                    <Panel class="flex-col" :no-padding="true">
                        <div class="margin-md">
                            <div class="flex-row gap-md flex-top">
                                <HostBattle v-model="createLobbyModalIsOpen" />
                                <LeaveConfirmModal
                                    v-model="leaveConfirmModalIsOpen"
                                    @cancel-leave="cancelLeaveLobby"
                                    @confirm-leave="(n) => leaveLobby(n)"
                                    :lobby-id="autojoinLobbyId"
                                />
                                <Checkbox v-model="settingsStore.battlesHidePvE" :label="t('lobby.multiplayer.custom.filters.hidePvE')" />
                                <Checkbox
                                    v-model="settingsStore.battlesHideLocked"
                                    :label="t('lobby.multiplayer.custom.filters.hideLocked')"
                                />
                                <Checkbox
                                    v-model="settingsStore.battlesHideEmpty"
                                    :label="t('lobby.multiplayer.custom.filters.hideEmpty')"
                                />
                                <Checkbox
                                    v-model="settingsStore.battlesHideInProgress"
                                    :label="t('lobby.multiplayer.custom.filters.hideInProgress')"
                                />
                                <SearchBox v-model="searchVal" class="expand" />
                                <Button
                                    v-if="lobbyStore.activeLobby == undefined"
                                    class="blue"
                                    @click="createLobbyModalIsOpen = true"
                                    :disabled="lobbyStore.activeLobby != undefined"
                                    >{{ t("lobby.multiplayer.custom.hostBattle") }}</Button
                                >
                                <Button
                                    v-else
                                    class="red"
                                    @click="leaveConfirmModalIsOpen = true"
                                    :disabled="lobbyStore.activeLobby == undefined"
                                    >{{ t("lobby.multiplayer.custom.leaveLobby") }}</Button
                                >
                            </div>
                        </div>
                    </Panel>
                    <Panel class="flex-col fullheight" :no-padding="true">
                        <div class="margin-md fullheight">
                            <div class="flex-col flex-grow fullheight flex-top">
                                <div class="scroll-container">
                                    <DataTable
                                        v-model:selection="lobbyStore.selectedLobby"
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
                                        @row-select="lobbyStore.selectedLobby = $event.data"
                                        @row-dblclick="sendLobbyJoinRequest($event.data)"
                                    >
                                        <Column field="currentBattle" sortable>
                                            <template #body="{ data }">
                                                <div class="flex-row flex-center-items gap-md">
                                                    <div v-if="data.currentBattle" class="flex-row flex-center-items">
                                                        <Icon :icon="swordcross" height="17" />
                                                    </div>
                                                </div>
                                            </template>
                                        </Column>
                                        <Column field="name" :header="t('lobby.multiplayer.custom.table.title')" sortable />
                                        <Column field="mapName" :header="t('lobby.multiplayer.custom.table.map')" sortable />
                                        <Column
                                            :header="t('lobby.multiplayer.custom.table.players')"
                                            sortable
                                            sortField="playerCount.value"
                                        >
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
                    </Panel>
                </div>
                <div v-if="!loading && tachyonStore.isConnected" class="right margin-left-md margin-right-lg">
                    <Panel class="fullheight flex-col">
                        <div class="flex flex-col">
                            <p>{{ lobbyStore.activeLobby?.name }}</p>

                            <LobbyPreview v-if="lobbyStore.selectedLobby" :lobby="lobbyStore.selectedLobby"></LobbyPreview>
                            <div class="flex flex-col">
                                <Button
                                    v-if="lobbyStore.activeLobby == undefined"
                                    class="green margin-top-lg margin-bottom-lg"
                                    @click="sendLobbyJoinRequest(lobbyStore.selectedLobby)"
                                    :disabled="lobbyStore.selectedLobby == undefined"
                                    >{{ t("lobby.multiplayer.custom.table.join") }}</Button
                                >
                                <Button v-else class="green margin-top-lg margin-bottom-lg" @click="battleStore.isLobbyOpened = true">
                                    {{ t("lobby.multiplayer.custom.openCurrentLobby") }}
                                </Button>
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import account from "@iconify-icons/mdi/account";
import eye from "@iconify-icons/mdi/eye";
import robot from "@iconify-icons/mdi/robot";
import swordcross from "@iconify-icons/mdi/sword-cross";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { ref, computed, onActivated } from "vue";
import HostBattle from "@renderer/components/battle/HostBattle.vue";
import Loader from "@renderer/components/common/Loader.vue";
import Button from "@renderer/components/controls/Button.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import SearchBox from "@renderer/components/controls/SearchBox.vue";
import { settingsStore } from "@renderer/store/settings.store";
import { lobby, lobbyStore } from "@renderer/store/lobby.store";
import LobbyPreview from "@renderer/components/battle/LobbyPreview.vue";
import { battleStore } from "@renderer/store/battle.store";
import LeaveConfirmModal from "@renderer/components/battle/LeaveConfirmModal.vue";
import { useTypedI18n } from "@renderer/i18n";
import { LobbyOverview } from "tachyon-protocol/types";
import { tachyonStore } from "@renderer/store/tachyon.store";
import Panel from "@renderer/components/common/Panel.vue";

const { t } = useTypedI18n();
const loading = ref<boolean>(false);
const createLobbyModalIsOpen = ref<boolean>(false);
const leaveConfirmModalIsOpen = ref<boolean>(false);
const searchVal = ref<string>("");
const autojoinLobbyId = ref<string>();
const lobbyList = computed(() => {
    const arr: LobbyOverview[] = [];
    for (const lobbyKey in lobbyStore.lobbyList) {
        const item = lobbyStore.lobbyList[lobbyKey];
        arr.push(item);
    }
    return arr;
});

function leaveLobby(id?: string) {
    leaveConfirmModalIsOpen.value = false;
    lobby.leaveLobby();
    if (id != undefined) {
        lobby.joinLobby({ id: id });
        autojoinLobbyId.value = undefined;
    }
}
function cancelLeaveLobby() {
    leaveConfirmModalIsOpen.value = false;
    autojoinLobbyId.value = undefined;
}

function sendLobbyJoinRequest(data) {
    //Data here is the entire selectedLobby object (e.g. one of the lobbyList[] items)
    if (lobbyStore.activeLobby == undefined) {
        // No active lobby so we can freely join without worrying about a leave needed first.
        lobby.joinLobby({ id: data.id });
        return;
    } else if (lobbyStore.activeLobby.id == data.id) {
        //We are trying to join a lobby we are already in, just open the view, no request needed.
        battleStore.isLobbyOpened = true;
        return;
    }
    //We will need to leave this lobby first, so warn the user.
    autojoinLobbyId.value = data.id;
    leaveConfirmModalIsOpen.value = true;
}

// Because this page is part of <KeepAlive>, we use this instead of onMounted() to trigger anytime the page is loaded.
onActivated(() => {
    lobby.subscribeList();
});
</script>

<style lang="scss" scoped>
.right {
    position: relative;
    min-width: 400px;
    max-width: 400px;
}

.expand {
    flex-grow: 1;
}
</style>
