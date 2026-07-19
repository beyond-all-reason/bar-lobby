// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Signal } from "$/jaz-ts-utils/signal";

export type MapDownloadQueueEntry = {
    springName: string;
    status: "queued" | "downloading";
};

type QueuedMapDownload = {
    springName: string;
    resolve: () => void;
    reject: (error: unknown) => void;
};

/** Owns the serial map-download lifecycle and exposes only observable queue state. */
export class MapDownloadQueue {
    public readonly onChanged: Signal<MapDownloadQueueEntry[]> = new Signal();

    private readonly queue: QueuedMapDownload[] = [];
    private readonly pendingDownloads = new Map<string, Promise<void>>();
    private activeDownload?: QueuedMapDownload;
    private isProcessing = false;

    public constructor(private readonly download: (springName: string) => Promise<void>) {}

    public getSnapshot(): MapDownloadQueueEntry[] {
        return [
            ...(this.activeDownload ? [{ springName: this.activeDownload.springName, status: "downloading" as const }] : []),
            ...this.queue.map((download) => ({ springName: download.springName, status: "queued" as const })),
        ];
    }

    public enqueue(springName: string): Promise<void> {
        const pendingDownload = this.pendingDownloads.get(springName);
        if (pendingDownload) return pendingDownload;

        let resolve!: () => void;
        let reject!: (error: unknown) => void;
        const download = new Promise<void>((resolveDownload, rejectDownload) => {
            resolve = resolveDownload;
            reject = rejectDownload;
        });

        this.pendingDownloads.set(springName, download);
        this.queue.push({ springName, resolve, reject });
        this.dispatchChanged();
        void this.process();
        return download;
    }

    private async process() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        try {
            while (this.queue.length > 0) {
                const queuedDownload = this.queue.shift();
                if (!queuedDownload) continue;

                this.activeDownload = queuedDownload;
                this.dispatchChanged();
                try {
                    await this.download(queuedDownload.springName);
                    queuedDownload.resolve();
                } catch (error) {
                    queuedDownload.reject(error);
                } finally {
                    this.pendingDownloads.delete(queuedDownload.springName);
                    this.activeDownload = undefined;
                    this.dispatchChanged();
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    private dispatchChanged() {
        this.onChanged.dispatch(this.getSnapshot());
    }
}
