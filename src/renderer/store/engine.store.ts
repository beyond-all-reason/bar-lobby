// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { DEFAULT_ENGINE_VERSION } from "@main/config/default-versions";
import { EngineVersion } from "@main/content/engine/engine-version";
import { reactive } from "vue";

export const enginesStore: {
    isInitialized: boolean;
    availableEngineVersions: EngineVersion[];
    selectedEngineVersion?: EngineVersion;
} = reactive({
    isInitialized: false,
    availableEngineVersions: [],
    selectedEngineVersion: undefined,
});

async function refreshStore() {
    enginesStore.availableEngineVersions = await window.engine.listAvailableVersions();
    enginesStore.selectedEngineVersion = enginesStore.availableEngineVersions.find((e) => e.id === DEFAULT_ENGINE_VERSION);
    if (!enginesStore.selectedEngineVersion) {
        throw new Error(`Default engine version ${DEFAULT_ENGINE_VERSION} not found in available versions.`);
    }
}

export async function initEnginesStore() {
    window.downloads.onDownloadEngineComplete(async (downloadInfo) => {
        console.debug("Received engine download completed event", downloadInfo);
        await refreshStore();
    });
    await refreshStore();
    enginesStore.isInitialized = true;
}
