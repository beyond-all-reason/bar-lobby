<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal
        :modelValue="modelValue"
        :title="t('lobby.multiplayer.custom.mapPicker.title')"
        style="height: 80vh; width: 80vw; max-width: 1440px"
        @update:modelValue="(open: boolean) => emit('update:modelValue', open)"
    >
        <div class="layout">
            <div class="map-filters">
                <MapFiltersComponent />
            </div>
            <MapListComponent ref="list" compact :selected="picked" @map-selected="toggle" />
        </div>
        <template #footer>
            <div class="flex-row flex-center-items gap-md fullwidth padding-md">
                <span>{{ t("lobby.multiplayer.custom.mapPicker.selected", { count: picked.size }) }}</span>
                <Button class="flex-right" @click="selectAllShown">{{ t("lobby.multiplayer.custom.mapPicker.selectAllShown") }}</Button>
                <Button :disabled="picked.size === 0" @click="picked = new Set()">{{
                    t("lobby.multiplayer.custom.mapPicker.clear")
                }}</Button>
                <Button class="blue" @click="done">{{ t("lobby.multiplayer.custom.mapPicker.done") }}</Button>
            </div>
        </template>
    </Modal>
</template>

<script lang="ts" setup>
import { provide, ref, shallowRef, watch } from "vue";
import type { MapData } from "@main/content/maps/map-data";
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import MapFiltersComponent from "@renderer/components/maps/MapFiltersComponent.vue";
import MapListComponent from "@renderer/components/maps/MapListComponent.vue";
import { createMapFilterState, MAP_FILTERS_KEY } from "@renderer/store/maps.store";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const props = defineProps<{
    modelValue: boolean;
    selected: string[];
}>();

const emit = defineEmits<{
    (event: "update:modelValue", open: boolean): void;
    (event: "done", springNames: string[]): void;
}>();

// Narrowing the maps here shouldn't change what the maps library shows, so this gets its own filters.
provide(MAP_FILTERS_KEY, createMapFilterState());

const list = ref<InstanceType<typeof MapListComponent> | null>(null);
const picked = shallowRef<Set<string>>(new Set(props.selected));

watch(
    () => props.modelValue,
    (open) => {
        if (open) picked.value = new Set(props.selected);
    }
);

function toggle(map: MapData) {
    const next = new Set(picked.value);
    if (!next.delete(map.springName)) next.add(map.springName);
    picked.value = next;
}

async function selectAllShown() {
    const names = (await list.value?.matchingMapNames()) ?? [];
    picked.value = new Set([...picked.value, ...names]);
}

function done() {
    emit("done", [...picked.value]);
    emit("update:modelValue", false);
}
</script>

<style lang="scss" scoped>
.layout {
    display: flex;
    flex-direction: row;
    gap: 20px;
    height: 100%;
}
.map-filters {
    width: 300px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}
</style>
