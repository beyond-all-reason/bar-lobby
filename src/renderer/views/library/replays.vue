<route lang="json5">
{ meta: { title: "Replays", order: 0, transition: { name: "slide-left" }, offine: true } }
</route>

<template>
    <div class="view">
        <div class="replay-container">
            <div class="view-title">
                <h1>Replays</h1>
            </div>
            <div class="flex-row flex-grow gap-md">
                <div class="flex-col flex-grow gap-md">
                    <Panel class="flex-grow">
                        <div class="flex-col fullheight gap-md">
                            <div class="flex-row gap-md">
                                <TriStateCheckbox v-model="endedNormally" label="Ended Normally" />
                                <Checkbox v-model="showSpoilers" label="Show Spoilers" />
                                <div class="flex-right flex-row gap-md" style="padding-right: 5px">
                                    <Button @click="openBrowserToReplayService">Browse Online Replays</Button>
                                    <Button @click="openReplaysFolder">Open Replays Folder</Button>
                                </div>
                            </div>
                            <div class="scroll-container padding-right-sm">
                                <DataTable
                                    v-model:first="offset"
                                    v-model:selection="selectedReplay"
                                    :lazy="true"
                                    :value="replays"
                                    :paginator="true"
                                    :rows="limit"
                                    :totalRecords="totalReplays"
                                    selectionMode="single"
                                    dataKey="fileName"
                                    :sortOrder="sortOrder === 'asc' ? 1 : -1"
                                    :sortField="sortField"
                                    @page="onPage"
                                    @sort="onSort"
                                >
                                    <template #empty>No replays found</template>
                                    <Column header="Name">
                                        <template #body="{ data }">
                                            <template v-if="data.preset === 'duel'">
                                                {{ data.contenders?.[0]?.name ?? "Nobody" }} vs
                                                {{ data.contenders?.[1]?.name ?? "Nobody" }}
                                            </template>
                                            <template v-else-if="data.preset === 'team'">
                                                {{ data.teams[0].playerCount }} vs {{ data.teams[1].playerCount }}
                                            </template>
                                            <template v-if="data.preset === 'ffa'"> {{ data.contenders.length }} Way FFA </template>
                                            <template v-if="data.preset === 'teamffa'">
                                                {{ data.teams[0].playerCount }} Way Team FFA
                                            </template>
                                        </template>
                                    </Column>
                                    <Column header="Date" :sortable="true" sortField="startTime">
                                        <template #body="{ data }">
                                            {{ format(data.startTime, "yyyy/MM/dd hh:mm a") }}
                                        </template>
                                    </Column>
                                    <Column header="Duration" :sortable="true" sortField="gameDurationMs">
                                        <template #body="{ data }">
                                            {{ getFriendlyDuration(data.gameDurationMs) }}
                                        </template>
                                    </Column>
                                    <Column field="mapSpringName" header="Map" :sortable="true" sortField="mapSpringName" />
                                </DataTable>
                            </div>
                        </div>
                    </Panel>
                </div>
                <div class="right-section">
                    <Panel class="flex-grow">
                        <ReplayPreview :replay="selectedReplay" :showSpoilers="showSpoilers">
                            <template #actions="{ replay }">
                                <DownloadContentButton v-if="map" :map="map" @click="watchReplay(replay)">Watch</DownloadContentButton>
                                <Button v-else disabled style="flex-grow: 1">Watch</Button>
                                <Button v-if="replay" @click="showReplayFile(replay)">Show File</Button>
                                <Button v-else disabled>Show File</Button>
                            </template>
                        </ReplayPreview>
                    </Panel>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
/**
 * TODO:
 * - Local replays
 * - Online replays
 * - Preview pane
 * - Searchable
 * - Sortable
 * - Filterable
 * - Paginated
 * - Watched
 * - Favorite
 */

// https://primefaces.org/primevue/datatable/lazy

import { format } from "date-fns";
import Column from "primevue/column";
import { Ref, ref, shallowRef } from "vue";

import Button from "@renderer/components/controls/Button.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import TriStateCheckbox from "@renderer/components/controls/TriStateCheckbox.vue";
import { getFriendlyDuration } from "@renderer/utils/misc";
import { Replay } from "@main/content/replays/replay";
import DataTable, { DataTablePageEvent, DataTableSortEvent } from "primevue/datatable";
import Panel from "@renderer/components/common/Panel.vue";
import { db } from "@renderer/store/db";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import ReplayPreview from "@renderer/components/battle/ReplayPreview.vue";
import DownloadContentButton from "@renderer/components/controls/DownloadContentButton.vue";

const endedNormally: Ref<boolean | null> = ref(true);
const showSpoilers = ref(true);
const totalReplays = ref(0);
const offset = ref(0);
const limit = ref(15);
const sortField: Ref<keyof Replay> = ref("startTime");
const sortOrder: Ref<"asc" | "desc"> = ref("desc");
const selectedReplay: Ref<Replay | null> = shallowRef(null);

const replays = useDexieLiveQueryWithDeps([endedNormally, offset, limit, sortField, sortOrder], () => {
    let query;
    if (endedNormally.value !== null) {
        query = db.replays
            .where("gameEndedNormally")
            .equals(endedNormally.value ? 1 : 0)
            .offset(offset.value)
            .limit(limit.value);
    } else {
        query = db.replays.offset(offset.value).limit(limit.value);
    }
    if (sortOrder.value === "asc") {
        return query.sortBy(sortField.value);
    }
    return query.reverse().sortBy(sortField.value);
});

const map = useDexieLiveQueryWithDeps([() => selectedReplay.value?.mapSpringName], () => {
    if (!selectedReplay.value) return null;
    return db.maps.get(selectedReplay.value.mapSpringName);
});

function onPage(event: DataTablePageEvent) {
    offset.value = event.first;
}

function onSort(event: DataTableSortEvent) {
    sortField.value = event.sortField as keyof Replay;
    sortOrder.value = event.sortOrder === 1 ? "asc" : "desc";
}

function openBrowserToReplayService() {
    window.shell.openInBrowser("https://bar-rts.com/replays");
}

function openReplaysFolder() {
    window.shell.openReplaysDir();
}

function watchReplay(replay: Replay) {
    window.game.launchReplay(replay);
}

function showReplayFile(replay: Replay) {
    window.shell.showReplayInFolder(replay.fileName);
}
</script>

<style lang="scss" scoped>
.replay-view {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;

    padding: 60px 60px 100px 60px;

    gap: 20px;
    padding-bottom: 120px;
    align-self: center;
}

.replay-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    align-self: center;
    width: 1600px;
}

.right-section {
    display: flex;
    height: 100%;
    position: relative;
    width: 400px;
}
</style>
