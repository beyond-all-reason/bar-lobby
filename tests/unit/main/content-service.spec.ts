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

    // A removal never reports bytes, so counting it as something in progress drags the taskbar figure
    // down for as long as it is outstanding.
    it("leaves removals out of the taskbar figure", () => {
        const setProgressBar = vi.fn();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contentService.registerProgressHandler({ setProgressBar } as any);

        signals.contentChanged.dispatch([
            { type: "map", id: "Quicksilver", status: "acquiring", currentBytes: 80, totalBytes: 100, progress: 0.8, attempts: 1 },
            { type: "map", id: "Tangerine", status: "removing", currentBytes: 0, totalBytes: 0, progress: 0, attempts: 1 },
        ]);

        expect(setProgressBar).toHaveBeenLastCalledWith(0.8);
    });

    // Same rule as the navbar figure: content leaves the change stream the moment it lands, so averaging
    // over what is left restarts from nothing every time the queue moves to its next batch.
    it("does not drop the taskbar figure at a batch handover", () => {
        const setProgressBar = vi.fn();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contentService.registerProgressHandler({ setProgressBar } as any);

        const BATCH = 4;
        const ids = Array.from({ length: 12 }, (_, index) => `map-${index}`);
        const entry = (id: string, status: string, progress: number) => ({ type: "map", id, status, currentBytes: progress * 100, totalBytes: 100, progress, attempts: 1 });
        const at = (landed: number, fraction: number) => ids.slice(landed).map((id, index) => (index < BATCH ? entry(id, "acquiring", fraction) : entry(id, "queued", 0)));

        let highest = 0;
        for (let landed = 0; landed < ids.length; landed += BATCH) {
            for (const fraction of [0, 0.5, 1]) {
                signals.contentChanged.dispatch(at(landed, fraction));
                const current = setProgressBar.mock.calls.at(-1)?.[0] as number;
                expect(current).toBeGreaterThanOrEqual(highest);
                highest = current;
            }
        }

        expect(highest).toBeCloseTo(1);
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
