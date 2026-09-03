// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { DownloadInfo } from "@main/content/downloads";
import { reactive } from "vue";

// App updates only.
export const downloadsStore: {
    isInitialized: boolean;
    updateDownloads: DownloadInfo[];
} = reactive({
    isInitialized: false,
    updateDownloads: [],
});

export function initDownloadsStore() {
    if (downloadsStore.isInitialized) {
        console.warn("Downloads store is already initialized. Skipping initialization.");
        return;
    }
    window.autoUpdater.onDownloadUpdateProgress((downloadInfo) => {
        downloadsStore.updateDownloads = downloadInfo ? [downloadInfo] : [];
    });

    downloadsStore.isInitialized = true;
}
