<route lang="json">
{ "meta": { "title": "Replays", "order": 0, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ title }}</h1>

        <div v-for="(replay, i) in replays" :key="i">
            {{ replay.gameId }}
        </div>

        <Paginator :rows="10" :totalRecords="totalRecords" :rowsPerPageOptions="[10, 20, 30]"></Paginator>
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

import Paginator from "primevue/paginator";
import { ref } from "vue";

const replays = await api.content.replays.getReplays(0, 100);

const title = api.router.currentRoute.value.meta.title;
const totalRecords = ref(120);
</script>

<style lang="scss" scoped></style>
