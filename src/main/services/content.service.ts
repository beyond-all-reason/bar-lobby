// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { autoUpdaterAPI } from "@main/content/auto-updater";
import { contentAPI } from "@main/content/content-api";
import { ContentRef } from "@main/content/content-ref";
import { DownloadInfo } from "@main/content/downloads";
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
}

// The taskbar shows a single bar for everything downloading, and app updates come from outside the
// content layer, so both sources are totalled here rather than either one owning the window.
function registerProgressHandler(mainWindow: Electron.CrossProcessExports.BrowserWindow) {
    let contentProgress: number[] = [];
    const updaterDownloads: Map<string, DownloadInfo> = new Map();

    function refresh() {
        const progress = [...contentProgress, ...[...updaterDownloads.values()].map((download) => download.progress)];

        mainWindow.setProgressBar(progress.length === 0 ? -1 : progress.reduce((total, value) => total + value, 0) / progress.length);
    }

    contentAPI.onChanged.add((state) => {
        contentProgress = state.filter((entry) => entry.status !== "failed").map((entry) => entry.progress);
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
