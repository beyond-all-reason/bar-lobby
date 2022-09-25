<route lang="json">
{ "meta": { "title": "Replays", "order": 0, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div class="flex-row flex-grow gap-md">
        <div class="flex-col flex-grow gap-md">
            <h1>{{ title }}</h1>

            <DataTable
                v-model:first="offset"
                v-model:selection="selectedReplay"
                :lazy="true"
                :value="replays"
                :paginator="true"
                :rows="limit"
                :totalRecords="totalReplays"
                selectionMode="single"
                dataKey="id"
                @page="onPage"
                @rowSelect="onRowSelect"
            >
                <Column field="title" header="Title"></Column>
                <Column field="date" header="Date"></Column>
                <Column field="duration" header="Duration"></Column>
                <Column field="map" header="Map"></Column>
            </DataTable>
        </div>
        <div class="right">
            <ReplayPreview v-if="selectedReplay" :replay="selectedReplay" />
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

import { format, intervalToDuration } from "date-fns";
import Column from "primevue/column";
import { DataTablePageEvent, DataTableRowSelectEvent } from "primevue/datatable";
import { Ref, ref } from "vue";

import DataTable from "@/components/controls/DataTable.vue";
import ReplayPreview from "@/components/misc/ReplayPreview.vue";
import { ReplayPreviewData, SelectableReplayData } from "@/model/replay";

const title = api.router.currentRoute.value.meta.title;
const totalReplays = await api.content.replays.getTotalReplayCount();
const offset = ref(0);
const limit = ref(10);
const replays: Ref<ReplayPreviewData[]> = ref([]);
const selectedReplay: Ref<SelectableReplayData | null> = ref(null);

const replayDataToPreview = (replayData: SelectableReplayData): ReplayPreviewData => {
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
    const rows = await api.content.replays.getReplays(offset.value, limit.value);
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
</script>

<style lang="scss" scoped>
.right {
    position: relative;
    width: 400px;
}
</style>
