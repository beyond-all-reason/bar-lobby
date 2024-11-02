import { DownloadInfo } from "@main/content/downloads";
import { reactive } from "vue";

export const downloadsStore = reactive({
    isInitialized: false,
    mapDownloads: [],
    engineDownloads: [],
    gameDownloads: [],
} as {
    isInitialized: boolean;
    mapDownloads: (DownloadInfo & { caching: boolean })[];
    engineDownloads: DownloadInfo[];
    gameDownloads: DownloadInfo[];
});

function mapFileNameToFriendlyName(fileName: string) {
    const friendlyName = fileName
        .replace(/\.sd7$/, "")
        .replaceAll("_", " ")
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
        .join(" ");
    return friendlyName;
}

export function initDownloadsStore() {
    window.downloads.onDownloadMapStart((downloadInfo) => {
        console.debug("Download started", downloadInfo);
        downloadsStore.mapDownloads.push({ ...downloadInfo, caching: false });
    });
    window.downloads.onDownloadMapComplete((downloadInfo) => {
        console.debug("Download complete", downloadInfo);
    });
    window.maps.onMapCachingStarted((mapName) => {
        console.debug("Map caching started", mapName);
        // Hack to find the index of the map download in the store, we have nothing but the filename
        const index = downloadsStore.mapDownloads.findIndex((download) => mapFileNameToFriendlyName(download.name) === mapFileNameToFriendlyName(mapName));
        if (index !== -1) {
            downloadsStore.mapDownloads[index] = { ...downloadsStore.mapDownloads[index], caching: true };
        } else {
            downloadsStore.mapDownloads.push({ name: mapFileNameToFriendlyName(mapName), currentBytes: 1, totalBytes: 1, type: "map", caching: true });
        }
    });
    window.maps.onMapCached((mapData) => {
        console.debug("Map cached", mapData);
        const index = downloadsStore.mapDownloads.findIndex((download) => mapFileNameToFriendlyName(download.name) === mapFileNameToFriendlyName(mapData.fileName));
        if (index !== -1) {
            downloadsStore.mapDownloads = downloadsStore.mapDownloads.filter((download) => download.name !== mapFileNameToFriendlyName(mapData.fileName));
        }
    });
    window.downloads.onDownloadMapProgress((downloadInfo) => {
        console.debug("Download progress", downloadInfo);
        const index = downloadsStore.mapDownloads.findIndex((download) => download.name === downloadInfo.name);
        if (index !== -1) {
            downloadsStore.mapDownloads[index] = { ...downloadInfo, caching: false };
        }
    });

    window.downloads.onDownloadEngineStart((downloadInfo) => {
        console.debug("Download started", downloadInfo);
        downloadsStore.engineDownloads.push(downloadInfo);
    });
    window.downloads.onDownloadEngineComplete((downloadInfo) => {
        console.debug("Download complete", downloadInfo);
        downloadsStore.engineDownloads = downloadsStore.engineDownloads.filter((download) => download.name !== downloadInfo.name);
    });
    window.downloads.onDownloadEngineProgress((downloadInfo) => {
        console.debug("Download progress", downloadInfo);
        const index = downloadsStore.engineDownloads.findIndex((download) => download.name === downloadInfo.name);
        if (index !== -1) {
            downloadsStore.engineDownloads[index] = downloadInfo;
        }
    });

    window.downloads.onDownloadGameStart((downloadInfo) => {
        console.debug("Download started", downloadInfo);
        downloadsStore.gameDownloads.push(downloadInfo);
    });
    window.downloads.onDownloadGameComplete((downloadInfo) => {
        console.debug("Download complete", downloadInfo);
        downloadsStore.gameDownloads = downloadsStore.gameDownloads.filter((download) => download.name !== downloadInfo.name);
    });
    window.downloads.onDownloadGameProgress((downloadInfo) => {
        console.debug("Download progress", downloadInfo);
        const index = downloadsStore.gameDownloads.findIndex((download) => download.name === downloadInfo.name);
        if (index !== -1) {
            downloadsStore.gameDownloads[index] = downloadInfo;
        }
    });

    // TODO handle download failure correctly in the UI
    // window.downloads.onDownloadMapFail((downloadInfo) => {
    //     console.debug("Download failed", downloadInfo);
    //     downloadsStore.mapDownloads = downloadsStore.mapDownloads.filter((download) => download.name !== downloadInfo.name);
    // });

    downloadsStore.isInitialized = true;
}
