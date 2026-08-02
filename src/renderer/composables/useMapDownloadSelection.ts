// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, ref, type Ref } from "vue";

import type { MapData } from "@main/content/maps/map-data";
import { downloadsStore } from "@renderer/store/downloads.store";
import { mapsStore, queueMapDownloads } from "@renderer/store/maps.store";

type DownloadableMap = Pick<MapData, "springName" | "isInstalled">;
type MapCatalog = readonly DownloadableMap[] | undefined;

/**
 * Owns map-catalog download selection while retaining the catalog's visible order for batch submission.
 */
export function useMapDownloadSelection(maps: Ref<MapCatalog>) {
    const selectedMapNames = ref(new Set<string>());
    const queuedMapNames = computed(() => new Set(downloadsStore.mapDownloadQueue.map((entry) => entry.springName)));
    const selectedDownloadMapNames = computed(() => (maps.value ?? []).filter((map) => selectedMapNames.value.has(map.springName) && isEligible(map)).map((map) => map.springName));
    const eligibleMapNames = computed(() => (maps.value ?? []).filter(isEligible).map((map) => map.springName));

    function isEligible(map: DownloadableMap) {
        return !map.isInstalled && !mapsStore.availableMapNames.has(map.springName) && !queuedMapNames.value.has(map.springName);
    }

    function toggle(springName: string) {
        const nextSelection = new Set(selectedMapNames.value);
        if (nextSelection.has(springName)) {
            nextSelection.delete(springName);
        } else {
            nextSelection.add(springName);
        }
        selectedMapNames.value = nextSelection;
    }

    function selectAll() {
        selectedMapNames.value = new Set(eligibleMapNames.value);
    }

    function clearSelection() {
        selectedMapNames.value = new Set();
    }

    function submit() {
        queueMapDownloads(selectedDownloadMapNames.value);
        selectedMapNames.value = new Set();
    }

    return {
        selectedMapNames,
        selectedDownloadMapNames,
        isEligible,
        toggle,
        selectAll,
        clearSelection,
        submit,
    };
}
