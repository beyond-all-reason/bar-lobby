// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT
import { configStore } from "@renderer/store/config.store";
import { EngineVersion } from "@main/content/engine/engine-version";
import { notificationsApi } from "@renderer/api/notifications";
import { onContentSettled } from "@renderer/store/contents.store";
import { computed, reactive } from "vue";

export const enginesStore: {
    isInitialized: boolean;
    availableEngineVersions: EngineVersion[];
    selectedEngineVersion?: EngineVersion;
} = reactive({
    isInitialized: false,
    availableEngineVersions: [],
    selectedEngineVersion: undefined,
});

export const installedEngineVersions = computed(() => enginesStore.availableEngineVersions.filter((e) => e.installed));

// The default is a version picked to work with the default game version rather than the newest one
// published, so it stays the preferred choice whenever it is installed.
export const defaultEngineInstalled = computed(() => enginesStore.availableEngineVersions.some((e) => e.id === configStore.defaultEngineVersion && e.installed));

let requestedEngineVersion: string | undefined;

function reselectEngineVersion() {
    const installed = (id?: string) => installedEngineVersions.value.find((e) => e.id === id);

    enginesStore.selectedEngineVersion =
        installed(requestedEngineVersion) ??
        installed(configStore.defaultEngineVersion) ??
        installedEngineVersions.value.at(-1) ??
        enginesStore.availableEngineVersions.find((e) => e.id === configStore.defaultEngineVersion);
}

export function selectEngineVersion(version?: EngineVersion) {
    requestedEngineVersion = version?.id;
    reselectEngineVersion();
}

export async function refreshEnginesStore() {
    enginesStore.availableEngineVersions = await window.engine.listAvailableVersions();
    reselectEngineVersion();
}

export async function downloadEngine(engineString: string) {
    await window.engine
        .downloadEngine(engineString)
        .then(refreshEnginesStore)
        .catch((error) => {
            console.error("Failed to download engine:", engineString, error);
            notificationsApi.alert({ text: "Engine download failed.", severity: "error" });
        });
}

export async function initEnginesStore() {
    onContentSettled(async (refs) => {
        if (refs.some((ref) => ref.type === "engine")) {
            await refreshEnginesStore();
        }
    });

    await refreshEnginesStore();
    if (!defaultEngineInstalled.value) {
        console.warn(`Default engine version ${configStore.defaultEngineVersion} is not installed — engine download required.`);
    }

    enginesStore.isInitialized = true;
}
