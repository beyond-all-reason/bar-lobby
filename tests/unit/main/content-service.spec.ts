// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

const { signals, handle } = vi.hoisted(() => {
    type Listener = (data: unknown) => void;

    function fakeSignal() {
        const listeners: Listener[] = [];

        return {
            add: (callback: Listener) => {
                listeners.push(callback);

                return callback;
            },
            dispatch: (data?: unknown) => listeners.forEach((listener) => listener(data)),
        };
    }

    const names = ["contentChanged", "contentSettled", "poolStart", "poolProgress", "poolComplete", "poolFail", "updateProgress", "updateComplete", "updateFail"] as const;
    const signals = Object.fromEntries(names.map((name) => [name, fakeSignal()])) as Record<(typeof names)[number], ReturnType<typeof fakeSignal>>;

    return { signals, handle: vi.fn() };
});

vi.mock("@main/typed-ipc", () => ({ ipcMain: { handle } }));
vi.mock("@main/content/content-api", () => ({
    contentAPI: { onChanged: signals.contentChanged, onSettled: signals.contentSettled, missing: vi.fn(), state: vi.fn(), ensure: vi.fn(), remove: vi.fn() },
}));
vi.mock("@main/content/game/pool-cdn", () => ({
    poolCdnDownloader: {
        onDownloadStart: signals.poolStart,
        onDownloadProgress: signals.poolProgress,
        onDownloadComplete: signals.poolComplete,
        onDownloadFail: signals.poolFail,
        preloadPoolData: vi.fn(),
    },
}));
vi.mock("@main/content/auto-updater", () => ({
    autoUpdaterAPI: { onDownloadProgress: signals.updateProgress, onDownloadComplete: signals.updateComplete, onDownloadFail: signals.updateFail },
}));

import contentService from "@main/services/content.service";

describe("content service", () => {
    const send = vi.fn();

    beforeEach(() => {
        send.mockReset();
        handle.mockReset();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contentService.registerIpcHandlers({ send } as any);
    });

    it("forwards content changes", () => {
        signals.contentChanged.dispatch([]);

        expect(send).toHaveBeenCalledWith("content:changed", []);
    });

    // The renderer's download list totals content and app updates together, so an update that reports
    // nowhere leaves the list and the progress figure short of what is actually running.
    it("forwards app update progress", () => {
        const downloadInfo = { type: "update", id: "0.15.4", name: "0.15.4", currentBytes: 5, totalBytes: 10, progress: 0.5 };

        signals.updateProgress.dispatch(downloadInfo);

        expect(send).toHaveBeenCalledWith("downloads:update:progress", downloadInfo);
    });

    it("clears the update once it finishes", () => {
        signals.updateComplete.dispatch({});

        expect(send).toHaveBeenCalledWith("downloads:update:progress", null);
    });

    it("clears the update when it fails", () => {
        signals.updateFail.dispatch({});

        expect(send).toHaveBeenCalledWith("downloads:update:progress", null);
    });

    it("clears the pool prefetch once it finishes", () => {
        signals.poolComplete.dispatch({});

        expect(send).toHaveBeenCalledWith("content:poolPrefetch", null);
    });
});
