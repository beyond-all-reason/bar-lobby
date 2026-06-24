<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Dropdown
        class="faction-select"
        :modelValue="modelValue ?? null"
        :options="factionOptions"
        optionLabel="label"
        optionValue="value"
        @update:modelValue="setFaction"
        @click.stop
        @mousedown.stop
    />
</template>

<script lang="ts" setup>
import Dropdown from "primevue/dropdown";
import { computed } from "vue";

import { Faction } from "@main/game/battle/battle-types";

const props = withDefaults(
    defineProps<{
        allowGamePicker?: boolean;
        modelValue?: Faction;
    }>(),
    { allowGamePicker: true }
);

interface FactionOption {
    label: string;
    value: Faction | null;
}

const emit = defineEmits<{
    (event: "update:modelValue", faction?: Faction): void;
}>();

const sideOptions: FactionOption[] = [
    { label: Faction.Armada, value: Faction.Armada },
    { label: Faction.Cortex, value: Faction.Cortex },
    { label: Faction.Random, value: Faction.Random },
    { label: Faction.Legion, value: Faction.Legion },
];

const factionOptions = computed<FactionOption[]>(() => [
    ...(props.allowGamePicker ? [{ label: "Pick in game", value: null }] : []),
    ...sideOptions,
]);

function setFaction(faction: Faction | null) {
    emit("update:modelValue", faction ?? undefined);
}
</script>

<style lang="scss" scoped>
.faction-select {
    width: 128px;
    min-width: 128px;
    font-size: 13px;

    :deep(.p-dropdown-label) {
        padding: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    :deep(.p-dropdown-trigger) {
        width: 20px;
    }
}
</style>
