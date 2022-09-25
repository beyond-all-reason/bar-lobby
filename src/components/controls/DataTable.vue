<template>
    <DataTable v-bind="$attrs">
        <template v-for="(_, name) in ($slots as {})" #[name]="slotData">
            <slot :name="name" v-bind="slotData || {}" />
        </template>
    </DataTable>
</template>

<script lang="ts" setup>
import DataTable, { DataTableProps } from "primevue/datatable";

// eslint-disable-next-line
interface Props extends DataTableProps {
    disabled?: boolean;
}

const props = defineProps<Props>();
</script>

<style lang="scss" scoped></style>
