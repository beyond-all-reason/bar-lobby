// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { DownloadInfo } from "@main/content/downloads";
import { reactive } from "vue";

// App updates only. Content downloads live in contents.store.
export const downloadsStore: {
    isInitialized: boolean;
    updateDownloads: DownloadInfo[];
} = reactive({
    isInitialized: false,
    updateDownloads: [],
});

export function initDownloadsStore() {
    window.autoUpdater.onDownloadUpdateProgress((downloadInfo) => {
        downloadsStore.updateDownloads = [downloadInfo];
    });

    downloadsStore.isInitialized = true;
}
