<template>
    <DataTable v-bind="$attrs">
        <template v-for="(_, name) in ($slots as {})" #[name]="slotData">
            <slot :name="name" v-bind="slotData || {}" />
        </template>
    </DataTable>
</template>

<script lang="ts" setup>
// https://primefaces.org/primevue/datatable

import DataTable, { DataTableProps } from "primevue/datatable";

export interface Props extends DataTableProps {
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
            vertical-align: middle;
            & > * {
                height: 100%;
            }
        }
    }
    th {
        background: rgba(255, 255, 255, 0.1);
    }
    :not(.p-datatable-thead) > tr {
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
}
.p-paginator-bottom {
    display: flex;
    justify-content: center;
}
</style>
