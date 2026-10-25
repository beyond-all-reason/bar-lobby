// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { DownloadInfo } from "@main/content/downloads";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { onDownloadUpdateProgress } = vi.hoisted(() => ({ onDownloadUpdateProgress: vi.fn() }));

vi.stubGlobal("window", Object.assign(window, { autoUpdater: { onDownloadUpdateProgress } }));

import { downloadsStore, initDownloadsStore } from "@renderer/store/downloads.store";

function update(currentBytes: number, totalBytes: number): DownloadInfo {
    return { type: "update", id: "0.15.4", name: "0.15.4", currentBytes, totalBytes, progress: currentBytes / totalBytes };
}

describe("update downloads", () => {
    let push: (downloadInfo: DownloadInfo | null) => void;

    beforeEach(() => {
        onDownloadUpdateProgress.mockReset();
        downloadsStore.updateDownloads = [];
        downloadsStore.isInitialized = false;

        initDownloadsStore();
        push = onDownloadUpdateProgress.mock.calls[0][0];
    });

    it("shows an update while it is downloading", () => {
        push(update(50, 100));

        expect(downloadsStore.updateDownloads).toHaveLength(1);
        expect(downloadsStore.updateDownloads[0].currentBytes).toBe(50);
    });

    // Main sends null once the updater finishes or gives up. Keeping the entry would leave the download
    // list holding something nothing is doing any more.
    it("drops the update once main says it is over", () => {
        push(update(50, 100));

        push(null);

        expect(downloadsStore.updateDownloads).toEqual([]);
    });
});
