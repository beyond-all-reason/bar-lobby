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

<style lang="scss">
.p-datatable {
    display: flex;
    flex-direction: column;
    gap: 10px;
    &-wrapper {
        border: 1px solid rgba(255, 255, 255, 0.2);
    }
    tr {
        th,
        td {
            padding: 5px 10px;
        }
    }
    th {
        background: rgba(255, 255, 255, 0.1);
    }
    .p-selectable-row {
        background: rgba(255, 255, 255, 0.1);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        &:hover:not(.p-highlight) {
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.2);
        }
        &.p-highlight {
            background: rgba(255, 255, 255, 0.3);
            border-top: 1px solid rgba(255, 255, 255, 0.3);
        }
    }
    &-thead {
    }
}
</style>
