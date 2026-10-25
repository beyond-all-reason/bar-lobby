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
                        v-model="customLobbiesStore.autoRefresh"
                        :label="t('lobby.multiplayer.custom.autoRefresh')"
                        v-tooltip.bottom="t('lobby.multiplayer.custom.autoRefreshTooltip')"
                    />
                    <div v-tooltip.bottom="{ value: joinTooltip, disabled: !joinTooltip }" class="join-lobby flex-right">
                        <Button class="green" :disabled="!canJoinSelected" @click="joinSelectedLobby">{{
                            t("lobby.multiplayer.custom.joinLobby")
                        }}</Button>
                    </div>
                    <Button v-if="lobbyStore.activeLobby == undefined" class="blue" @click="createLobbyModalIsOpen = true">{{
                        t("lobby.multiplayer.custom.hostBattle")
                    }}</Button>
                    <Button v-else class="blue" @click="router.push('/play/lobby')">{{ t("lobby.multiplayer.custom.openLobby") }}</Button>
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
                        :query="effectiveQuery"
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
                            <div
                                ref="tableArea"
                                class="table-area"
                                @mousedown="onTableMouseDown"
                                @mouseover="onTableMouseOver"
                                @mouseleave="hidePreview"
                                @scroll="hidePreview"
                            >
                                <DataTable
                                    :selection="selectedLobby"
                                    :value="source.rows.value"
                                    data-key="id"
                                    class="p-datatable-sm"
                                    selectionMode="single"
                                    lazy
                                    :sortField="customLobbiesStore.query.sort.key"
                                    :sortOrder="customLobbiesStore.query.sort.order"
                                    :rowClass="rowClass"
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
                                <LobbyOverviewPreview
                                    v-if="previewLobby && preview"
                                    :lobby="previewLobby"
                                    :anchor="preview.anchor"
                                    :x="preview.x"
                                />
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
import { Icon } from "@iconify/vue";
import account from "@iconify-icons/mdi/account";
import filterIcon from "@iconify-icons/mdi/filter-variant";
import refreshIcon from "@iconify-icons/mdi/refresh";
import swordCross from "@iconify-icons/mdi/sword-cross";
import { useNow, useResizeObserver } from "@vueuse/core";
import Column from "primevue/column";
import DataTable, { type DataTableRowClickEvent, type DataTableRowSelectEvent, type DataTableSortEvent } from "primevue/datatable";
import Paginator, { type PageState } from "primevue/paginator";
import { computed, onActivated, onBeforeUnmount, onDeactivated, ref, shallowRef, toRef, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import SearchBox from "@renderer/components/controls/SearchBox.vue";
import HostBattle from "@renderer/components/battle/HostBattle.vue";
import LobbyFilterChips from "@renderer/components/lobbies/list/LobbyFilterChips.vue";
import LobbyFilterMenu from "@renderer/components/lobbies/list/LobbyFilterMenu.vue";
import LobbyOverviewPreview from "@renderer/components/lobbies/list/LobbyOverviewPreview.vue";
import type { LobbyFilterChip } from "@renderer/components/lobbies/list/lobby-filter-chips";
import { createLocalLobbyListSource, DOUBLE_CLICK_HOLD_MS, lobbyMatchContext } from "@renderer/composables/useLobbyList";
import { openSpots } from "@renderer/logic/lobby-list/filters";
import type { LobbyListEntry, LobbyListRow } from "@renderer/model/lobby-list";
import { customLobbiesStore } from "@renderer/store/custom-lobbies.store";
import { lobby, lobbyStore } from "@renderer/store/lobby.store";
import { settingsStore } from "@renderer/store/settings.store";
import { tachyonStore } from "@renderer/store/tachyon.store";
import { useTypedI18n } from "@renderer/i18n";
import { getFriendlyDuration } from "@renderer/utils/misc";
import { cloneLobbyListQuery, type LobbyListQuery, type LobbySortKey } from "@shared/lobby-list-query";

const router = useRouter();

const { t } = useTypedI18n();

// The title filter, not persisted so the list doesn't open narrowed by an old search.
const searchVal = ref<string>("");
const menuOpen = ref(false);
const createLobbyModalIsOpen = ref<boolean>(false);

const effectiveQuery = computed<LobbyListQuery>(() => {
    const query = cloneLobbyListQuery(customLobbiesStore.query);
    const title = searchVal.value.trim();
    if (title) query.filters.title = title;
    return query;
});

const source = createLocalLobbyListSource({
    query: effectiveQuery.value,
    autoRefresh: toRef(customLobbiesStore, "autoRefresh"),
    context: lobbyMatchContext,
});

watch(effectiveQuery, (query) => source.setQuery(query));

// Last measured or typical height, for when no row has rendered.
const tableArea = useTemplateRef<HTMLElement>("tableArea");
let rowHeight = 37;

function fitPageSize() {
    const area = tableArea.value;
    // Zero while kept alive but hidden.
    if (!area || area.clientHeight === 0) return;
    const header = area.querySelector<HTMLElement>(".p-datatable-thead");
    const row = area.querySelector<HTMLElement>(".p-datatable-tbody > tr:not(.p-datatable-emptymessage)");
    const wrapper = area.querySelector<HTMLElement>(".p-datatable-wrapper");
    if (row) rowHeight = row.getBoundingClientRect().height || rowHeight;
    const borders = wrapper ? wrapper.offsetHeight - wrapper.clientHeight : 0;
    source.setPageSize((area.clientHeight - (header?.getBoundingClientRect().height ?? 0) - borders) / rowHeight);
}

// Fitting can resize the area again, which trips the observer's loop error if done in its callback.
let fitFrame = 0;
useResizeObserver(tableArea, () => {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(fitPageSize);
});
onBeforeUnmount(() => cancelAnimationFrame(fitFrame));
watch(() => source.rows.value.length, fitPageSize, { flush: "post" });

function applyQuery(query: LobbyListQuery) {
    const next = cloneLobbyListQuery(query);
    searchVal.value = next.filters.title ?? "";
    delete next.filters.title;
    customLobbiesStore.query = next;
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

function rowClass(row: LobbyListRow) {
    return [row.state, { "active-lobby": row.state !== "removed" && row.id === lobbyStore.activeLobby?.id }];
}

function onTableMouseDown() {
    if (customLobbiesStore.autoRefresh) source.holdOrder(DOUBLE_CLICK_HOLD_MS);
}

const PREVIEW_DELAY_MS = 300;
type HoveredRow = { element: HTMLTableRowElement; id: string; anchor: { top: number; bottom: number }; x: number };
const hovered = shallowRef<HoveredRow>();
const previewShown = ref(false);
let previewTimer: ReturnType<typeof setTimeout> | undefined;

const preview = computed(() => (previewShown.value ? hovered.value : undefined));
const previewLobby = computed(() => (preview.value ? (lobbyStore.lobbies[preview.value.id] as LobbyListEntry | undefined) : undefined));

function onTableMouseOver(event: MouseEvent) {
    const element = (event.target as Element).closest<HTMLTableRowElement>(".p-datatable-tbody > tr:not(.p-datatable-emptymessage)");
    if (element && element === hovered.value?.element) return;
    const row = element ? source.rows.value[element.sectionRowIndex] : undefined;
    if (!element || !row || row.state === "removed") return hidePreview();
    const rect = element.getBoundingClientRect();
    hovered.value = { element, id: row.id, anchor: { top: rect.top, bottom: rect.bottom }, x: event.clientX };
    if (previewShown.value) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => (previewShown.value = true), PREVIEW_DELAY_MS);
}

function hidePreview() {
    clearTimeout(previewTimer);
    hovered.value = undefined;
    previewShown.value = false;
}

watch(
    source.rows,
    () => {
        const current = hovered.value;
        if (current && (!current.element.isConnected || current.element.getBoundingClientRect().top !== current.anchor.top)) hidePreview();
    },
    { flush: "post" }
);

onDeactivated(hidePreview);
onBeforeUnmount(hidePreview);

const selectedId = ref<string>();
const selectedLobby = computed(() => (selectedId.value ? lobbyStore.lobbies[selectedId.value] : undefined));

function onRowSelect(event: DataTableRowSelectEvent) {
    const row = event.data as LobbyListRow;
    if (row.state === "removed") return;
    selectedId.value = row.id;
}

function onRowDoubleClick(event: DataTableRowClickEvent) {
    const row = event.data as LobbyListRow;
    if (row.state === "removed") return;
    sendLobbyJoinRequest(row.lobby.id);
}

const canJoinSelected = computed(() => !!selectedLobby.value && lobbyStore.activeLobby == undefined && tachyonStore.isConnected);

const joinTooltip = computed(() => {
    if (lobbyStore.activeLobby) return t("lobby.multiplayer.custom.leaveLobbyFirst");
    if (selectedLobby.value) return t("lobby.multiplayer.custom.joinLobbyNamed", { name: selectedLobby.value.name });
    return "";
});

function joinSelectedLobby() {
    if (!canJoinSelected.value || !selectedLobby.value) return;
    sendLobbyJoinRequest(selectedLobby.value.id);
}

function sendLobbyJoinRequest(id: string) {
    if (lobbyStore.activeLobby == undefined) {
        lobby.requestJoinLobby({ id, pushLobbyView: true });
        return;
    } else if (lobbyStore.activeLobby.id === id) {
        router.push("/play/lobby");
        return;
    }
}

// Because this page is part of <KeepAlive>, we use this instead of onMounted() to trigger anytime the page is loaded.
onActivated(() => {
    lobby.requestSubscribeList();
    source.refresh();
});
</script>

<style lang="scss" scoped>
.right {
    position: relative;
    min-width: 400px;
    max-width: 400px;
}
.view {
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
.join-lobby {
    display: flex;
}
.disconnected {
    margin-bottom: 10px;
    opacity: 0.8;
    font-style: italic;
}
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
// Uniform row heights for page fitting.
:deep(.p-datatable-tbody > tr > td) {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
// Specific enough to win over the shared table row styles in _primevue.scss.
:deep(.p-datatable-tbody > tr.active-lobby) {
    background: rgba(255, 215, 0, 0.12);
    outline: 1px solid gold;
    outline-offset: -1px;
    &:hover:not(.p-highlight) {
        background: rgba(255, 215, 0, 0.2);
    }
    &.p-highlight {
        background: rgba(255, 215, 0, 0.28);
    }
}
:deep(tr.stale) {
    opacity: 0.45;
}
:deep(tr.removed) {
    opacity: 0.6;
    pointer-events: none;
}
</style>
