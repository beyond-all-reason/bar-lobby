<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="flex-col gap-sm">
        <div v-if="selected.length" class="flex-row flex-wrap gap-sm">
            <div
                v-for="name in selected"
                :key="name"
                class="thumb"
                :style="`background-image: url('${imageUrl(name)}')`"
                v-tooltip.bottom="displayName(name)"
            >
                <div class="remove" @click="remove(name)">
                    <Icon :icon="closeThick" height="24" />
                </div>
            </div>
        </div>
        <span v-else class="txt-sm">{{ t("lobby.multiplayer.custom.filters.maps.none") }}</span>
        <div class="flex-row gap-sm">
            <Button @click="pickerOpen = true">{{ t("lobby.multiplayer.custom.filters.maps.choose") }}</Button>
            <Button v-if="selected.length" @click="emit('update:modelValue', undefined)">{{
                t("lobby.multiplayer.custom.filters.maps.clear")
            }}</Button>
        </div>
        <LobbyMapPickerModal v-model="pickerOpen" :selected="selected" @done="onPicked" />
    </div>
</template>

<script lang="ts" setup>
import defaultMiniMap from "/src/renderer/assets/images/default-minimap.png?url";
import { Icon } from "@iconify/vue";
import closeThick from "@iconify-icons/mdi/close-thick";
import type { MapData } from "@main/content/maps/map-data";
import { computed, ref } from "vue";
import Button from "@renderer/components/controls/Button.vue";
import LobbyMapPickerModal from "@renderer/components/lobbies/list/LobbyMapPickerModal.vue";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { useImageBlobUrlCache } from "@renderer/composables/useImageBlobUrlCache";
import { db } from "@renderer/store/db";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const props = defineProps<{
    modelValue?: string[];
}>();

const emit = defineEmits<{
    (event: "update:modelValue", value: string[] | undefined): void;
}>();

const pickerOpen = ref(false);
const cache = useImageBlobUrlCache();

const selected = computed(() => props.modelValue ?? []);

// Lobby maps may not be in the local database.
const mapData = useDexieLiveQueryWithDeps(selected, (names: string[]) => db.maps.bulkGet(names), {
    initialValue: [] as (MapData | undefined)[],
});
const mapsByName = computed(
    () => new Map(mapData.value.filter((map): map is MapData => map !== undefined).map((map) => [map.springName, map]))
);

function displayName(name: string) {
    return mapsByName.value.get(name)?.displayName ?? name;
}

function imageUrl(name: string) {
    const preview = mapsByName.value.get(name)?.imagesBlob?.preview;
    return (preview && cache.get(name, preview)) || defaultMiniMap;
}

function remove(name: string) {
    const remaining = selected.value.filter((other) => other !== name);
    emit("update:modelValue", remaining.length ? remaining : undefined);
}

function onPicked(names: string[]) {
    emit("update:modelValue", names.length ? names : undefined);
}
</script>

<style lang="scss" scoped>
.thumb {
    position: relative;
    width: 48px;
    height: 48px;
    background-size: cover;
    background-position: center;
    border: 1px solid rgba(255, 255, 255, 0.2);
    &:hover {
        border-color: black;
        .remove {
            opacity: 1;
        }
    }
}
// Covers the thumbnail so clicks land here; global styles disable pointer events on svgs.
.remove {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    background: rgba(0, 0, 0, 0.6);
}
</style>
