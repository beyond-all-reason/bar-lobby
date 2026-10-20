// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

const { mockExtract7z, mockMkdir, mockRm, features } = vi.hoisted(() => ({
    features: { downloadEngineAndGame: true },
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
vi.mock("@main/config/edition", () => ({ EDITION: "test", EDITION_FEATURES: features }));
vi.mock("@main/utils/extract-7z", () => ({ extract7z: mockExtract7z }));
vi.mock("@main/utils/file", () => ({ fileExists: vi.fn().mockResolvedValue(false) }));
vi.mock("@main/services/config.service", () => {
    return {
        configService: {
            getConfig: vi.fn(() => ({ initialPoolDataUrl: "https://pool-init.beyondallreason.dev" })),
        },
    };
});

import { PoolCdnDownloader } from "@main/content/game/pool-cdn";

describe("PoolCdnDownloader", () => {
    it("publishes a pool download before a resumed transfer emits its first progress event", async () => {
        const downloader = new PoolCdnDownloader();
        const startedDownloads: Array<{ name: string; currentBytes: number; totalBytes: number }> = [];
        const progressed: Array<{ name: string; currentBytes: number; totalBytes: number }> = [];
        downloader.onDownloadStart.add((downloadInfo) => startedDownloads.push({ ...downloadInfo }));
        downloader.onDownloadProgress.add((downloadInfo) => progressed.push({ ...downloadInfo }));

        await downloader.preloadPoolData();

        expect(startedDownloads).toHaveLength(1);
        expect(startedDownloads[0]).toMatchObject({ name: "pool-data", currentBytes: 0, totalBytes: 1 });
        expect(progressed).toEqual(expect.arrayContaining([expect.objectContaining({ name: "pool-data", currentBytes: 64, totalBytes: 128 })]));
    });

    // The seed writes into the assets directory and only serves a game download.
    it("does nothing on an edition that does not download games", async () => {
        features.downloadEngineAndGame = false;
        mockMkdir.mockClear();
        const downloader = new PoolCdnDownloader();
        const started = vi.fn();
        downloader.onDownloadStart.add(started);

        try {
            await downloader.preloadPoolData();
        } finally {
            features.downloadEngineAndGame = true;
        }

        expect(started).not.toHaveBeenCalled();
        expect(mockMkdir).not.toHaveBeenCalled();
    });
});
