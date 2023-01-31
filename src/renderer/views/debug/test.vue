<route lang="json5">
{ meta: { title: "Test", order: 2 } }
</route>

<template>
    <div>
        <DataTable :value="data" class="p-datatable-lg">
            <Column field="name" header="Name"></Column>
            <Column field="color" header="Colour"></Column>
            <Column field="number" header="Number"></Column>
        </DataTable>
    </div>
</template>

<script lang="ts" setup>
import Column from "primevue/column";

import DataTable from "@/components/controls/DataTable.vue";

const data = [
    {
        name: "bob",
        color: "red",
        number: 5,
    },
    {
        name: "fred",
        color: "blue",
        number: 10,
    },
];
</script>

<style lang="scss" scoped></style>
