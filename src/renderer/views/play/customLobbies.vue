<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Custom Lobbies", order: 5, devOnly: true, onlineOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-row flex-grow gap-md hide-overflow fullheight">
        <div class="flex-col flex-grow gap-md">
            <div class="flex-row gap-md">
                <h1>{{ t("lobby.multiplayer.custom.title") }}</h1>
            </div>
            <div class="flex-row gap-md">
                <Checkbox v-model="settingsStore.battlesHidePvE" :label="t('lobby.multiplayer.custom.filters.hidePvE')" />
                <Checkbox v-model="settingsStore.battlesHideLocked" :label="t('lobby.multiplayer.custom.filters.hideLocked')" />
                <Checkbox v-model="settingsStore.battlesHideEmpty" :label="t('lobby.multiplayer.custom.filters.hideEmpty')" />
                <Checkbox v-model="settingsStore.battlesHideInProgress" :label="t('lobby.multiplayer.custom.filters.hideInProgress')" />
                <SearchBox v-model="searchVal" />
            </div>
            <Panel class="flex-col fullheight" :no-padding="true">
                <div class="margin-md fullheight">
                    <div class="flex-col flex-grow fullheight flex-top">
                        <div class="scroll-container">
                            <DataTable
                                :value="lobbyList"
                                data-key="id"
                                autoLayout
                                class="p-datatable-sm"
                                selectionMode="single"
                                paginator
                                :rows="16"
                                :pageLinkSize="20"
                            >
                                <template #empty>
                                    <p>No lobbies /o\</p>
                                </template>
                                <Column field="name" :header="t('lobby.multiplayer.custom.table.title')" sortable />
                                <Column field="mapName" :header="t('lobby.multiplayer.custom.table.map')" sortable>
                                    <template #body="{ data }">
                                        <p>{{ data.mapName }}</p>
                                    </template>
                                </Column>
                                <Column :header="t('lobby.multiplayer.custom.table.players')" sortable sortField="playerCount.value">
                                    <template #body="{ data }">
                                        <div class="flex-row flex-center-items gap-md">
                                            <div v-if="data.playerCount > 0" class="flex-row flex-center-items" style="gap: 2px">
                                                <Icon :icon="account" height="17" />{{ data.playerCount }}/{{ data.maxPlayerCount }}
                                            </div>
                                            <!-- no protocol support for bot and spec count in the listing. If required, need to add it to tachyon first -->
                                            <!-- <div v-if="true" class="flex-row flex-center-items gap-xs" style="gap: 4px"> -->
                                            <!--     <Icon :icon="eye" height="17" />{{ 0 }} -->
                                            <!-- </div> -->
                                            <!-- <div v-if="true" class="flex-row flex-center-items gap-xs" style="gap: 4px"> -->
                                            <!--     <Icon :icon="robot" height="17" />{{ 0 }} -->
                                            <!-- </div> -->
                                        </div>
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                    </div>
                </div>
            </Panel>
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
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { computed, ComputedRef, onActivated, onDeactivated, ref } from "vue";
import Panel from "@renderer/components/common/Panel.vue";

import Checkbox from "@renderer/components/controls/Checkbox.vue";
import SearchBox from "@renderer/components/controls/SearchBox.vue";
import { settingsStore } from "@renderer/store/settings.store";
import { useTypedI18n } from "@renderer/i18n";
import { lobby, lobbyStore } from "@renderer/store/lobby.store";
import { LobbyOverview } from "tachyon-protocol/types";

const { t } = useTypedI18n();
const searchVal = ref<string>("");

const lobbyList: ComputedRef<LobbyOverview[]> = computed(() => Object.values(lobbyStore.lobbies));

// Because this page is part of <KeepAlive>, we use this instead of onMounted() to trigger anytime the page is loaded.
onActivated(() => {
    lobby.subscribeList();
});

onDeactivated(() => {
    lobby.unsubscribeList();
});
</script>

<style lang="scss" scoped>
.right {
    position: relative;
    min-width: 400px;
    max-width: 400px;
}
</style>
