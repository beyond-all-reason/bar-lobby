<template>
    <Paginator v-bind="$attrs">
        <template v-for="(_, name) in ($slots as {})" #[name]="slotData">
            <slot :name="name" v-bind="slotData || {}" />
        </template>
    </Paginator>
</template>

<script lang="ts" setup>
import Paginator, { PaginatorProps } from "primevue/paginator";

export interface Props extends PaginatorProps {
    disabled?: boolean;
}

const props = defineProps<Props>();
</script>

<style lang="scss"></style>
