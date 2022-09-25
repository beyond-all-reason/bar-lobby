<route lang="json">
{ "meta": { "title": "Replays", "order": 0, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ title }}</h1>

        <DataTable v-model:first="offset" :lazy="true" :value="replays" :paginator="true" :rows="limit" :totalRecords="totalReplays" @page="onPage">
            <Column field="title" header="Title"></Column>
            <Column field="date" header="Date"></Column>
            <Column field="duration" header="Duration"></Column>
            <Column field="map" header="Map"></Column>
        </DataTable>
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

import { format } from "date-fns";
import Column from "primevue/column";
import { DataTablePageEvent } from "primevue/datatable";
import { Ref, ref } from "vue";

import DataTable from "@/components/controls/DataTable.vue";

type ReplayPreview = {
    title: string;
    date: string;
    duration: string;
    map: string;
    game: string;
    engine: string;
};

const title = api.router.currentRoute.value.meta.title;
const totalReplays = await api.content.replays.getTotalReplayCount();
const offset = ref(0);
const limit = ref(10);
const replays: Ref<ReplayPreview[]> = ref([]);

const fetchReplays = async () => {
    const rows = await api.content.replays.getReplays(offset.value, limit.value);
    replays.value = rows.map((row) => {
        let title: string = row.preset;
        if (row.preset === "duel") {
            title = `${row.contenders?.[0]?.name ?? "Nobody"} vs ${row.contenders?.[1]?.name ?? "Nobody"}`;
        } else if (row.preset === "team") {
            title = `${row.teams[0].playerCount} vs ${row.teams[1].playerCount}`;
        } else if (row.preset === "ffa") {
            title = `${row.contenders.length} Way FFA`;
        } else if (row.preset === "teamffa") {
            title = `${row.teams[0].playerCount} Way Team FFA`;
        }

        const date = format(row.startTime, "yyyy/MM/dd hh:mm a");
        const duration = format(row.gameDurationMs, "mm:ss");
        const map = row.mapScriptName;
        const game = row.gameVersion;
        const engine = row.engineVersion;

        return { title, date, duration, map, game, engine };
    });
};

fetchReplays();

const onPage = (event: DataTablePageEvent) => {
    offset.value = event.first;
    fetchReplays();
};
</script>

<style lang="scss" scoped></style>
