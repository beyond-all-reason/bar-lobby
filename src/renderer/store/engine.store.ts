import { reactive, watch } from "vue";
import { EngineVersion } from "@main/content/engine/engine-version";

export const enginesStore = reactive<{
    isInitialized: boolean;
    installedEngineVersions: EngineVersion[];
    availableEngineVersions: EngineVersion[];
    selectedEngineVersion?: EngineVersion;
}>({
    isInitialized: false,
    installedEngineVersions: [],
    availableEngineVersions: [],
    selectedEngineVersion: undefined,
});

async function refreshStore() {
    enginesStore.installedEngineVersions = await window.engine.getInstalledVersions();
    enginesStore.availableEngineVersions = await window.engine.listAvailableVersions();
}

watch(
    () => enginesStore.selectedEngineVersion,
    async (engineVersion) => {
        if (!engineVersion.installed) {
            await window.engine.downloadEngine(engineVersion.id);
        }
    }
);

export async function initEnginesStore() {
    window.downloads.onDownloadEngineComplete(async (downloadInfo) => {
        console.debug("Received engine download completed event", downloadInfo);
        await refreshStore();
    });
    await refreshStore();
    enginesStore.selectedEngineVersion = enginesStore.installedEngineVersions.at(-1);
    enginesStore.isInitialized = true;
}
