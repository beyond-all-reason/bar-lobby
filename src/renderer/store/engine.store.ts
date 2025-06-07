// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive, watch } from "vue";
import { EngineVersion } from "@main/content/engine/engine-version";

class EnginesStore {
    isInitialized: boolean;
    availableEngineVersions: EngineVersion[];
    selectedEngineVersion?: EngineVersion;
    defaultEngineVersion?: EngineVersion;

    constructor() {
        this.isInitialized = false;
        this.availableEngineVersions = [];
        this.selectedEngineVersion = undefined;
        this.defaultEngineVersion = undefined;
    }

    async refreshStore() {
        this.availableEngineVersions = await window.engine.listAvailableVersions();
    }

    getEngineVersion() {
        return this.selectedEngineVersion ?? this.defaultEngineVersion;
    }

    setEngineVersion(engine: EngineVersion) {
        if (engine.id === this.defaultEngineVersion?.id) {
            this.selectedEngineVersion = undefined;
        } else {
            this.selectedEngineVersion = engine;
        }
    }
}

export const enginesStore = reactive(new EnginesStore());

watch(
    () => enginesStore.selectedEngineVersion,
    async (engineVersion) => {
        if (!engineVersion) {
            return;
        }

        if (!engineVersion.installed) {
            await window.engine.downloadEngine(engineVersion.id);
        }
    }
);

export async function initEnginesStore() {
    window.downloads.onDownloadEngineComplete(async (downloadInfo) => {
        console.debug("Received engine download completed event", downloadInfo);
        await enginesStore.refreshStore();
    });
    await enginesStore.refreshStore();
    enginesStore.isInitialized = true;
}
