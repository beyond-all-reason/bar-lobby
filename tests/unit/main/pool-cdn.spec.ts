// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

const { mockExtract7z, mockMkdir, mockRm } = vi.hoisted(() => ({
    mockExtract7z: vi.fn().mockResolvedValue(undefined),
    mockMkdir: vi.fn().mockResolvedValue(undefined),
    mockRm: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node-downloader-helper", () => ({
    DownloaderHelper: class {
        private readonly handlers = new Map<string, (stats: { downloaded: number; total: number; progress: number }) => void>();

        public on(event: string, callback: (stats: { downloaded: number; total: number; progress: number }) => void) {
            this.handlers.set(event, callback);
        }

        public async start() {
            this.handlers.get("progress.throttled")?.({ downloaded: 64, total: 128, progress: 50 });
        }
    },
}));
vi.mock("@main/config/app", () => ({
    getAssetsPath: () => "/assets",
    getPoolPath: () => "/assets/pool",
}));
vi.mock("fs", () => ({ promises: { mkdir: mockMkdir, rm: mockRm } }));
vi.mock("@main/utils/extract-7z", () => ({ extract7z: mockExtract7z }));

import { PoolCdnDownloader } from "@main/content/game/pool-cdn";

describe("PoolCdnDownloader", () => {
    it("publishes a pool download before a resumed transfer emits its first progress event", async () => {
        const startedDownloads: Array<{ name: string; currentBytes: number; totalBytes: number }> = [];
        const gameApi = {
            onDownloadStart: {
                dispatch: vi.fn((downloadInfo) => startedDownloads.push({ ...downloadInfo })),
            },
            onDownloadComplete: { dispatch: vi.fn() },
            onDownloadProgress: { dispatch: vi.fn() },
            onDownloadFail: { dispatch: vi.fn() },
        };
        const downloader = new PoolCdnDownloader(gameApi as never);

        await downloader.preloadPoolData();

        expect(startedDownloads).toHaveLength(1);
        expect(startedDownloads[0]).toMatchObject({ name: "pool-data", currentBytes: 0, totalBytes: 1 });
        expect(gameApi.onDownloadProgress.dispatch).toHaveBeenCalledWith(expect.objectContaining({ name: "pool-data", currentBytes: 64, totalBytes: 128 }));
    });
});
