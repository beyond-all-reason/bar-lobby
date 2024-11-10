import { reactive } from "vue";
import { db } from "@renderer/store/db";
import { EngineVersion } from "@main/content/engine/engine-version";

export const enginesStore = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
    selectedEngineVersion?: EngineVersion;
});

async function refreshStore() {
    const engineVersions = await window.engine.getInstalledVersions();
    await db.engineVersions.clear();
    await db.engineVersions.bulkAdd(engineVersions);
    const latestEngineVersion = await db.engineVersions.orderBy("id").last();
    enginesStore.selectedEngineVersion = latestEngineVersion;
}

export async function initEnginesStore() {
    window.downloads.onDownloadEngineComplete(async (downloadInfo) => {
        console.debug("Received engine download completed event", downloadInfo);
        refreshStore();
    });
    refreshStore();
    enginesStore.isInitialized = true;
}
