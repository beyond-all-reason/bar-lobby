// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { DownloadInfo } from "@main/content/downloads";
import { reactive } from "vue";

export const downloadsStore: {
    isInitialized: boolean;
    mapDownloads: DownloadInfo[];
    engineDownloads: DownloadInfo[];
    gameDownloads: DownloadInfo[];
    updateDownloads: DownloadInfo[];
    gameRetrying: boolean;
    mapRetrying: boolean;
} = reactive({
    isInitialized: false,
    mapDownloads: [],
    engineDownloads: [],
    gameDownloads: [],
    updateDownloads: [],
    gameRetrying: false,
    mapRetrying: false,
});

export function initDownloadsStore() {
    window.downloads.onDownloadMapStart((downloadInfo) => {
        console.debug("Download started", downloadInfo);
        downloadsStore.mapDownloads.push({ ...downloadInfo });
    });
    window.downloads.onDownloadMapComplete((downloadInfo) => {
        console.debug("Download complete", downloadInfo);
        const index = downloadsStore.mapDownloads.findIndex((download) => download.name === downloadInfo.name);
        if (index !== -1) {
            downloadsStore.mapDownloads = downloadsStore.mapDownloads.filter((download) => download.name !== downloadInfo.name);
        }
    });
    window.downloads.onDownloadMapProgress((downloadInfo) => {
        console.debug("Download progress", downloadInfo);
        downloadsStore.mapRetrying = false;
        const index = downloadsStore.mapDownloads.findIndex((download) => download.name === downloadInfo.name);
        if (index !== -1) {
            downloadsStore.mapDownloads[index] = { ...downloadInfo };
        }
    });
    window.downloads.onDownloadMapFail((downloadInfo) => {
        console.error("Download map fail:", downloadInfo);
        downloadsStore.mapRetrying = false;
        const index = downloadsStore.mapDownloads.findIndex((download) => download.name === downloadInfo.name);
        downloadsStore.mapDownloads.splice(index, 1);
    });
    window.downloads.onDownloadMapRetry(() => {
        downloadsStore.mapRetrying = true;
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
    window.downloads.onDownloadEngineFail((downloadInfo) => {
        console.error("Download engine failed:", downloadInfo);
        const index = downloadsStore.engineDownloads.findIndex((download) => download.name === downloadInfo.name);
        downloadsStore.engineDownloads.splice(index, 1);
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
        downloadsStore.gameRetrying = false;
        const index = downloadsStore.gameDownloads.findIndex((download) => download.name === downloadInfo.name);
        if (index !== -1) {
            downloadsStore.gameDownloads[index] = downloadInfo;
        }
    });
    window.downloads.onDownloadGameFail((downloadInfo) => {
        console.error("Download game failed:", downloadInfo);
        downloadsStore.gameRetrying = false;
        const index = downloadsStore.gameDownloads.findIndex((download) => download.name === downloadInfo.name);
        downloadsStore.gameDownloads.splice(index, 1);
    });
    window.downloads.onDownloadGameRetry(() => {
        downloadsStore.gameRetrying = true;
    });

    window.autoUpdater.onDownloadUpdateProgress((downloadInfo) => {
        downloadsStore.updateDownloads = [downloadInfo];
    });

    downloadsStore.isInitialized = true;
}
