<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Custom Lobbies", order: 5, devOnly: true, onlineOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="flex-row flex-grow gap-md hide-overflow fullheight">
            <div class="flex-col flex-grow fullheight gap-md margin-left-lg margin-right-lg">
                <div class="flex-row gap-md">
                    <h1>{{ t("lobby.multiplayer.custom.title") }}</h1>
                </div>
                <div class="flex-row gap-md">
                    <SearchBox v-model="searchVal" />
                    <Button :class="{ active: menuOpen }" @click="menuOpen = !menuOpen">
                        <Icon :icon="filterIcon" height="20" />{{ t("lobby.multiplayer.custom.filtersButton") }}
                    </Button>
                    <Button
                        :disabled="!tachyonStore.isConnected"
                        v-tooltip.bottom="{
                            value: t('lobby.multiplayer.custom.newLobbies', source.pendingCount.value),
                            disabled: !source.pendingCount.value,
                        }"
                        @click="source.refresh()"
                    >
                        <Icon :icon="refreshIcon" height="20" />{{ t("lobby.multiplayer.custom.refresh") }}
                        <span v-if="source.pendingCount.value" class="badge">{{ source.pendingCount.value }}</span>
                    </Button>
                    <Checkbox
                        v-model="settingsStore.customLobbiesAutoRefresh"
                        :label="t('lobby.multiplayer.custom.autoRefresh')"
                        v-tooltip.bottom="t('lobby.multiplayer.custom.autoRefreshTooltip')"
                    />
                    <Button
                        v-if="lobbyStore.activeLobby == undefined"
                        class="blue flex-right"
                        @click="createLobbyModalIsOpen = true"
                        :disabled="lobbyStore.activeLobby != undefined"
                        >{{ t("lobby.multiplayer.custom.hostBattle") }}</Button
                    >
                </div>
                <LobbyFilterChips
                    :filters="effectiveQuery.filters"
                    :devMode="settingsStore.devMode"
                    :availableTags="source.availableTags.value"
                    @remove="removeChip"
                />
                <div class="list-area flex-col flex-grow">
                    <LobbyFilterMenu
                        v-model:open="menuOpen"
                        :query="settingsStore.customLobbiesQuery"
                        :devMode="settingsStore.devMode"
                        :availableTags="source.availableTags.value"
                        :availableEngineVersions="source.availableEngineVersions.value"
                        :availableGameVersions="source.availableGameVersions.value"
                        @apply="applyQuery"
                    />
                    <Panel class="flex-col fullheight" :no-padding="true">
                        <div class="list-body flex-col flex-grow margin-md gap-md">
                            <HostBattle v-model="createLobbyModalIsOpen" :mode="'create'" />
                            <p v-if="!tachyonStore.isConnected" class="disconnected">
                                {{ t("lobby.multiplayer.custom.disconnected") }}
                            </p>
                            <!-- Pages hold as many rows as fit here; it only scrolls if a row grows taller than the rest. -->
                            <div ref="tableArea" class="table-area">
                                <!-- Lazy, so the table never sorts or pages on its own: the source decides the order and holds it steady.
                                     Columns have fixed widths too, so they don't resize with whatever is on the page. -->
                                <DataTable
                                    :selection="lobbyStore.selectedLobby"
                                    :value="source.rows.value"
                                    data-key="id"
                                    class="p-datatable-sm"
                                    selectionMode="single"
                                    lazy
                                    :sortField="settingsStore.customLobbiesQuery.sort.key"
                                    :sortOrder="settingsStore.customLobbiesQuery.sort.order"
                                    :rowClass="(row: LobbyListRow) => row.state"
                                    @sort="onSort"
                                    @row-select="onRowSelect"
                                    @row-dblclick="onRowDoubleClick"
                                >
                                    <template #empty>
                                        <p>{{ t("lobby.multiplayer.custom.noLobbiesAvailable") }}</p>
                                    </template>
                                    <Column :header="t('lobby.multiplayer.custom.table.title')" sortable sortField="name">
                                        <template #body="{ data }: { data: LobbyListRow }">
                                            <i v-if="data.state === 'removed'">{{ t("lobby.multiplayer.custom.lobbyUnavailable") }}</i>
                                            <span v-else>{{ data.lobby.name }}</span>
                                        </template>
                                    </Column>
                                    <Column
                                        :header="t('lobby.multiplayer.custom.table.map')"
                                        headerClass="col-map"
                                        sortable
                                        sortField="mapName"
                                    >
                                        <template #body="{ data }: { data: LobbyListRow }">
                                            <span v-if="data.state !== 'removed'">{{ data.lobby.mapName }}</span>
                                        </template>
                                    </Column>
                                    <Column
                                        :header="t('lobby.multiplayer.custom.table.players')"
                                        headerClass="col-players"
                                        sortable
                                        sortField="playerCount"
                                    >
                                        <template #body="{ data }: { data: LobbyListRow }">
                                            <div v-if="data.state !== 'removed'" class="flex-row flex-center-items" style="gap: 2px">
                                                <Icon :icon="account" height="17" />{{ data.lobby.playerCount }}/{{
                                                    data.lobby.maxPlayerCount
                                                }}
                                            </div>
                                        </template>
                                    </Column>
                                    <Column
                                        :header="t('lobby.multiplayer.custom.table.openSpots')"
                                        headerClass="col-open-spots"
                                        sortable
                                        sortField="openSpots"
                                    >
                                        <template #body="{ data }: { data: LobbyListRow }">
                                            <span v-if="data.state !== 'removed'">{{ openSpots(data.lobby) }}</span>
                                        </template>
                                    </Column>
                                    <Column
                                        :header="t('lobby.multiplayer.custom.table.status')"
                                        headerClass="col-status"
                                        sortable
                                        sortField="battleDuration"
                                    >
                                        <template #body="{ data }: { data: LobbyListRow }">
                                            <template v-if="data.state !== 'removed'">
                                                <div v-if="data.lobby.currentBattle" class="flex-row flex-center-items gap-xs">
                                                    <Icon :icon="swordCross" height="17" />{{
                                                        runningFor(data.lobby.currentBattle.startedAt)
                                                    }}
                                                </div>
                                                <span v-else>{{ t("lobby.multiplayer.custom.table.waiting") }}</span>
                                            </template>
                                        </template>
                                    </Column>
                                </DataTable>
                            </div>
                            <Paginator
                                :first="source.first.value"
                                :rows="source.pageSize.value"
                                :totalRecords="source.totalRecords.value"
                                :pageLinkSize="20"
                                @page="(event: PageState) => source.setPage(event.first)"
                            />
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
/**
 * TODO:
 * - Host custom battle button (should request spawning a dedicated instance instead of being self-hosted)
 * - Host battle modal that includes options such as public/passworded/friends-only/invite-only, title, map, mode etc
 */

import { Icon } from "@iconify/vue";
import account from "@iconify-icons/mdi/account";
import filterIcon from "@iconify-icons/mdi/filter-variant";
import refreshIcon from "@iconify-icons/mdi/refresh";
import swordCross from "@iconify-icons/mdi/sword-cross";
import { useNow, useResizeObserver } from "@vueuse/core";
import Column from "primevue/column";
import DataTable, { type DataTableRowClickEvent, type DataTableRowSelectEvent, type DataTableSortEvent } from "primevue/datatable";
import Paginator, { type PageState } from "primevue/paginator";
import { computed, onActivated, onBeforeUnmount, ref, toRef, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import SearchBox from "@renderer/components/controls/SearchBox.vue";
import HostBattle from "@renderer/components/battle/HostBattle.vue";
import LobbyFilterChips from "@renderer/components/lobbies/list/LobbyFilterChips.vue";
import LobbyFilterMenu from "@renderer/components/lobbies/list/LobbyFilterMenu.vue";
import { openSpots, type LobbyFilterChip } from "@renderer/components/lobbies/list/lobby-filters";
import { createLocalLobbyListSource, lobbyMatchContext, reconcileTagsServer } from "@renderer/composables/useLobbyList";
import type { LobbyListRow } from "@renderer/model/lobby-list";
import { configStore } from "@renderer/store/config.store";
import { lobby, lobbyStore } from "@renderer/store/lobby.store";
import { settingsStore } from "@renderer/store/settings.store";
import { tachyonStore } from "@renderer/store/tachyon.store";
import { useTypedI18n } from "@renderer/i18n";
import { getFriendlyDuration } from "@renderer/utils/misc";
import { resolveLobbyServer } from "@shared/lobby-server";
import { cloneLobbyListQuery, type LobbyListQuery, type LobbySortKey } from "@shared/lobby-list-query";

const router = useRouter();

const { t } = useTypedI18n();

// The search box is the title filter. It isn't saved with the rest, so the list doesn't open
// already narrowed by something typed in a previous session.
const searchVal = ref<string>("");
const menuOpen = ref(false);
const createLobbyModalIsOpen = ref<boolean>(false);

const effectiveQuery = computed<LobbyListQuery>(() => {
    const query = cloneLobbyListQuery(settingsStore.customLobbiesQuery);
    const title = searchVal.value.trim();
    if (title) query.filters.title = title;
    return query;
});

const source = createLocalLobbyListSource({
    query: effectiveQuery.value,
    autoRefresh: toRef(settingsStore, "customLobbiesAutoRefresh"),
    context: lobbyMatchContext,
});

watch(effectiveQuery, (query) => source.setQuery(query));

// Sizes pages to the rows that fit in the table area, measured from a rendered row. Until one
// has rendered (an empty list) the last measurement, or a typical row height, stands in.
const tableArea = useTemplateRef<HTMLElement>("tableArea");
let rowHeight = 37;

function fitPageSize() {
    const area = tableArea.value;
    // Zero while the page is kept alive but not shown; keep the size it had.
    if (!area || area.clientHeight === 0) return;
    const header = area.querySelector<HTMLElement>(".p-datatable-thead");
    const row = area.querySelector<HTMLElement>(".p-datatable-tbody > tr:not(.p-datatable-emptymessage)");
    const wrapper = area.querySelector<HTMLElement>(".p-datatable-wrapper");
    if (row) rowHeight = row.getBoundingClientRect().height || rowHeight;
    const borders = wrapper ? wrapper.offsetHeight - wrapper.clientHeight : 0;
    source.setPageSize((area.clientHeight - (header?.getBoundingClientRect().height ?? 0) - borders) / rowHeight);
}

// Fitting re-renders the rows, which can resize the area again (its scrollbar coming or going).
// Doing that inside the observer's callback trips its loop error, so it waits for the next frame.
let fitFrame = 0;
useResizeObserver(tableArea, () => {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(fitPageSize);
});
onBeforeUnmount(() => cancelAnimationFrame(fitFrame));
watch(() => source.rows.value.length, fitPageSize, { flush: "post" });

// Lobby tags belong to the server, so ones picked on another server are dropped.
const currentServer = computed(() =>
    resolveLobbyServer(settingsStore.useDefaultServer, settingsStore.lobbyServerOverride, configStore.defaultServers ?? [])
);
watch(currentServer, (server) => reconcileTagsServer(settingsStore, server), { immediate: true });

function applyQuery(query: LobbyListQuery) {
    const next = cloneLobbyListQuery(query);
    searchVal.value = next.filters.title ?? "";
    delete next.filters.title;
    settingsStore.customLobbiesQuery = next;
}

function removeChip(chip: LobbyFilterChip) {
    const next = cloneLobbyListQuery(effectiveQuery.value);
    chip.remove(next.filters);
    applyQuery(next);
}

function onSort(event: DataTableSortEvent) {
    if (typeof event.sortField !== "string" || (event.sortOrder !== 1 && event.sortOrder !== -1)) return;
    applyQuery({ ...effectiveQuery.value, sort: { key: event.sortField as LobbySortKey, order: event.sortOrder } });
}

const now = useNow({ interval: 1000 });

function runningFor(startedAt: number) {
    // UnixTime is in microseconds.
    return getFriendlyDuration(Math.max(0, now.value.getTime() - startedAt / 1000));
}

function onRowSelect(event: DataTableRowSelectEvent) {
    const row = event.data as LobbyListRow;
    if (row.state === "removed") return;
    lobbyStore.selectedLobby = row.lobby;
}

function onRowDoubleClick(event: DataTableRowClickEvent) {
    const row = event.data as LobbyListRow;
    if (row.state === "removed") return;
    sendLobbyJoinRequest(row.lobby.id);
}

function sendLobbyJoinRequest(id: string) {
    if (lobbyStore.activeLobby == undefined) {
        // No active lobby so we can freely join without worrying about a leave needed first.
        lobby.requestJoinLobby({ id, pushLobbyView: true });
        return;
    } else if (lobbyStore.activeLobby.id === id) {
        //We are trying to join a lobby we are already in, just open the view, no request needed.
        router.push("/play/lobby");
        return;
    }
    // TODO: Get user confirmation that they want to leave a current lobby? Or do we just allow them to bounce?
}

// Because this page is part of <KeepAlive>, we use this instead of onMounted() to trigger anytime the page is loaded.
onActivated(() => {
    lobby.requestSubscribeList();
});
</script>

<style lang="scss" scoped>
.right {
    position: relative;
    min-width: 400px;
    max-width: 400px;
}
.view {
    // Down to just above the active lobby preview, rather than the usual space for page content below.
    padding-bottom: 60px;
}
.list-area {
    position: relative;
    min-height: 0;
}
.list-body {
    min-height: 0;
}
.table-area {
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
}
.badge {
    margin-left: 6px;
    padding: 0 6px;
    border-radius: 8px;
    font-size: 13px;
    background: rgba(255, 255, 255, 0.25);
}
.disconnected {
    margin-bottom: 10px;
    opacity: 0.8;
    font-style: italic;
}
// The title takes whatever the other columns leave.
:deep(.col-map) {
    width: 30%;
}
:deep(.col-players),
:deep(.col-open-spots) {
    width: 8.5em;
}
:deep(.col-status) {
    width: 9.5em;
}
// One line per row, so long titles and map names don't make some rows taller than others.
:deep(.p-datatable-tbody > tr > td) {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
:deep(tr.stale) {
    opacity: 0.45;
}
:deep(tr.removed) {
    opacity: 0.6;
    pointer-events: none;
}
</style>
