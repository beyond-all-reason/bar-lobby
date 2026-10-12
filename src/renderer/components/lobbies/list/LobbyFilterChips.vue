<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div v-if="chips.length" class="flex-row flex-wrap gap-sm">
        <Chip
            v-for="chip in chips"
            :key="chip.id"
            removable
            class="filter-chip"
            :class="{ warning: chip.warning }"
            v-tooltip.bottom="chip.tooltip"
            @remove="emit('remove', chip)"
        >
            <Icon :icon="chip.icon" height="18" />
            <span class="p-chip-text">{{ chip.label }}</span>
        </Chip>
    </div>
</template>

<script lang="ts" setup>
import type { MapData } from "@main/content/maps/map-data";
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import Chip from "primevue/chip";
import type { LobbyFilters } from "@shared/lobby-list-query";
import { lobbyFilterChips, type LobbyFilterChip } from "@renderer/components/lobbies/list/lobby-filter-chips";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { db } from "@renderer/store/db";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const props = defineProps<{
    filters: LobbyFilters;
    devMode: boolean;
    availableTags: string[];
}>();

const emit = defineEmits<{
    (event: "remove", chip: LobbyFilterChip): void;
}>();

const mapNames = computed(() => props.filters.maps ?? []);
const mapData = useDexieLiveQueryWithDeps(mapNames, (names: string[]) => db.maps.bulkGet(names), {
    initialValue: [] as (MapData | undefined)[],
});
const displayNames = computed(
    () => new Map(mapData.value.filter((map): map is MapData => map !== undefined).map((map) => [map.springName, map.displayName]))
);

const chips = computed(() =>
    lobbyFilterChips(props.filters, props.devMode, {
        t,
        mapDisplayName: (springName: string) => displayNames.value.get(springName) ?? springName,
        availableTags: new Set(props.availableTags),
    })
);
</script>

<style lang="scss" scoped>
.filter-chip {
    gap: 6px;
    padding: 2px 10px;
    // A whole number of pixels tall, so the list below doesn't land between pixels while chips show.
    line-height: 20px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    &.warning {
        opacity: 0.65;
        font-style: italic;
    }
}
</style>
