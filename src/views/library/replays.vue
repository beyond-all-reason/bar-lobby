<route lang="json">
{ "meta": { "title": "Replays", "order": 0, "transition": { "name": "slide-left" }, "offine": true } }
</route>

<template>
    <div class="flex-row flex-grow gap-md fullheight">
        <div class="flex-col flex-grow gap-md">
            <div class="flex-row gap-md">
                <h1>Local Replays</h1>
                <!-- <Divider layout="vertical" />
                <h1>Online Replays</h1> -->
            </div>

            <div class="flex-row gap-md">
                <TriStateCheckbox v-model="endedNormally" label="Ended Normally" @update:model-value="fetchReplays" />
                <Checkbox v-model="showSpoilers" label="Show Spoilers" />
                <div class="flex-right">
                    <Button @click="openReplaysFolder">Open Replays Folder</Button>
                </div>
            </div>

            <DataTable
                v-model:first="offset"
                v-model:selection="selectedReplayPreview"
                :lazy="true"
                :value="replays"
                :paginator="true"
                :rows="limit"
                :totalRecords="totalReplays"
                selectionMode="single"
                dataKey="id"
                @page="onPage"
                @row-select="onRowSelect"
            >
                <Column field="title" header="Title"></Column>
                <Column field="date" header="Date"></Column>
                <Column field="duration" header="Duration"></Column>
                <Column field="map" header="Map"></Column>
            </DataTable>
        </div>
        <div class="right">
            <ReplayPreview v-if="selectedReplay" :replay="selectedReplay" :showSpoilers="showSpoilers" />
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
 */

// https://primefaces.org/primevue/datatable/lazy

import { format, intervalToDuration } from "date-fns";
import { shell } from "electron";
import path from "path";
import Column from "primevue/column";
import { DataTablePageEvent, DataTableRowSelectEvent } from "primevue/datatable";
import { Ref, ref } from "vue";

import Button from "@/components/controls/Button.vue";
import Checkbox from "@/components/controls/Checkbox.vue";
import DataTable from "@/components/controls/DataTable.vue";
import TriStateCheckbox from "@/components/controls/TriStateCheckbox.vue";
import ReplayPreview from "@/components/misc/ReplayPreview.vue";
import { Replay, ReplayPreviewData } from "@/model/replay";

const title = api.router.currentRoute.value.meta.title;
const endedNormally: Ref<boolean | null> = ref(true);
const showSpoilers = ref(true);
const totalReplays = ref(0);
const offset = ref(0);
const limit = ref(18);
const replays: Ref<ReplayPreviewData[]> = ref([]);
const selectedReplayPreview: Ref<ReplayPreviewData | null> = ref(null);
const selectedReplay: Ref<Replay | null> = ref(null);

const replayDataToPreview = (replayData: Replay): ReplayPreviewData => {
    const id = replayData.replayId;
    const fileName = replayData.fileName;

    let title: string = replayData.preset;
    if (replayData.preset === "duel") {
        title = `${replayData.contenders?.[0]?.name ?? "Nobody"} vs ${replayData.contenders?.[1]?.name ?? "Nobody"}`;
    } else if (replayData.preset === "team") {
        title = `${replayData.teams[0].playerCount} vs ${replayData.teams[1].playerCount}`;
    } else if (replayData.preset === "ffa") {
        title = `${replayData.contenders.length} Way FFA`;
    } else if (replayData.preset === "teamffa") {
        title = `${replayData.teams[0].playerCount} Way Team FFA`;
    }

    const date = format(replayData.startTime, "yyyy/MM/dd hh:mm a"); // https://date-fns.org/v2.29.3/docs/format
    const durtationValues = intervalToDuration({ start: 0, end: replayData.gameDurationMs });
    const duration = `${durtationValues.hours}:${durtationValues.minutes?.toString().padStart(2, "0")}:${durtationValues.seconds?.toString().padStart(2, "0")}`;
    const map = replayData.mapScriptName;
    const game = replayData.gameVersion;
    const engine = replayData.engineVersion;

    return { id, fileName, title, date, duration, map, game, engine };
};

const fetchReplays = async () => {
    totalReplays.value = await api.content.replays.getTotalReplayCount();

    const rows = await api.content.replays.getReplays({
        offset: offset.value,
        limit: limit.value,
        endedNormally: endedNormally.value,
    });
    replays.value = rows.map(replayDataToPreview);
};

fetchReplays();

const onPage = (event: DataTablePageEvent) => {
    offset.value = event.first;
    fetchReplays();
};

const onRowSelect = async (event: DataTableRowSelectEvent) => {
    const replayData = await api.content.replays.getReplayById(event.data.id);
    selectedReplay.value = replayData;
};

const openReplaysFolder = () => {
    shell.openPath(path.join(api.content.replays.replaysDir));
};
</script>

<style lang="scss" scoped>
.right {
    position: relative;
    width: 400px;
    padding-right: 10px;
    overflow-y: scroll;
}
</style>
