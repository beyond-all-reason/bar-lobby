// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { autoUpdaterAPI } from "@main/content/auto-updater";
import { contentAPI } from "@main/content/content-api";
import { ContentRef } from "@main/content/content-ref";
import { DownloadInfo } from "@main/content/downloads";
import { createSettledCounter } from "@main/content/content-progress";
import { isInProgress } from "@main/content/content-state";
import { poolCdnDownloader } from "@main/content/game/pool-cdn";
import { BarIpcWebContents, ipcMain } from "@main/typed-ipc";

function registerIpcHandlers(webContents: BarIpcWebContents) {
    ipcMain.handle("content:missing", (_, refs: ContentRef[]) => contentAPI.missing(refs));
    ipcMain.handle("content:state", () => contentAPI.state());
    ipcMain.handle("content:ensure", (_, refs: ContentRef[]) => contentAPI.ensure(refs));
    ipcMain.handle("content:remove", (_, refs: ContentRef[]) => contentAPI.remove(refs));

    contentAPI.onChanged.add((state) => {
        webContents.send("content:changed", state);
    });
    contentAPI.onSettled.add((refs) => {
        webContents.send("content:settled", refs);
    });

    ipcMain.handle("content:preloadPool", () => poolCdnDownloader.preloadPoolData());

    // Warming the pool is not an operation on a piece of content, so it has no ref and cannot be
    // queued or checked for presence. It reports separately and the UI lists it alongside the rest.
    for (const signal of [poolCdnDownloader.onDownloadStart, poolCdnDownloader.onDownloadProgress]) {
        signal.add((downloadInfo) => webContents.send("content:poolPrefetch", downloadInfo));
    }
    for (const signal of [poolCdnDownloader.onDownloadComplete, poolCdnDownloader.onDownloadFail]) {
        signal.add(() => webContents.send("content:poolPrefetch", null));
    }

    // The updater sits outside the content layer and reports on its own channel, which the download list
    // totals alongside content.
    autoUpdaterAPI.onDownloadProgress.add((downloadInfo) => webContents.send("downloads:update:progress", downloadInfo));
    for (const signal of [autoUpdaterAPI.onDownloadComplete, autoUpdaterAPI.onDownloadFail]) {
        signal.add(() => webContents.send("downloads:update:progress", null));
    }
}

// The taskbar shows a single bar for everything downloading, and app updates come from outside the
// content layer, so both sources are totalled here rather than either one owning the window.
function registerProgressHandler(mainWindow: Electron.CrossProcessExports.BrowserWindow) {
    const countSettled = createSettledCounter();
    const updaterDownloads: Map<string, DownloadInfo> = new Map();
    let contentDone = 0;
    let contentCount = 0;

    // A reading can come back over its own total, because pr-downloader reports file counts and bytes
    // down the same channel.
    const fraction = (progress: number) => Math.min(1, progress);

    function refresh() {
        const updates = [...updaterDownloads.values()];
        const done = contentDone + updates.reduce((total, download) => total + fraction(download.progress), 0);
        const count = contentCount + updates.length;

        mainWindow.setProgressBar(count === 0 ? -1 : done / count);
    }

    contentAPI.onChanged.add((state) => {
        const outstanding = state.filter(isInProgress);
        const landed = countSettled(state);

        contentDone = landed + outstanding.reduce((total, entry) => total + fraction(entry.progress), 0);
        contentCount = landed + outstanding.length;
        refresh();
    });

    autoUpdaterAPI.onDownloadProgress.add((downloadInfo) => {
        updaterDownloads.set(downloadInfo.name, downloadInfo);
        refresh();
    });
    autoUpdaterAPI.onDownloadComplete.add((downloadInfo) => {
        updaterDownloads.delete(downloadInfo.name);
        refresh();
    });
    autoUpdaterAPI.onDownloadFail.add((downloadInfo) => {
        updaterDownloads.delete(downloadInfo.name);
        refresh();
    });
}

const contentService = {
    registerIpcHandlers,
    registerProgressHandler,
};

export default contentService;
