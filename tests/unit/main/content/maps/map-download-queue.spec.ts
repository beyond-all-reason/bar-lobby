// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { MapDownloadQueue } from "@main/content/maps/map-download-queue";

type Deferred = {
    resolve: () => void;
};

async function flushQueue() {
    await Promise.resolve();
    await Promise.resolve();
}

describe("MapDownloadQueue", () => {
    it("owns FIFO state and exposes only ordered queue snapshots", async () => {
        const started: string[] = [];
        const pending = new Map<string, Deferred>();
        const queue = new MapDownloadQueue((springName) => {
            started.push(springName);
            return new Promise<void>((resolve) => pending.set(springName, { resolve }));
        });

        const first = queue.enqueue("map-a");
        const duplicate = queue.enqueue("map-a");
        const second = queue.enqueue("map-b");

        expect(duplicate).toBe(first);
        expect(started).toEqual(["map-a"]);
        expect(queue.getSnapshot()).toEqual([
            { springName: "map-a", status: "downloading" },
            { springName: "map-b", status: "queued" },
        ]);

        pending.get("map-a")?.resolve();
        await flushQueue();

        expect(started).toEqual(["map-a", "map-b"]);
        expect(queue.getSnapshot()).toEqual([{ springName: "map-b", status: "downloading" }]);

        pending.get("map-b")?.resolve();
        await expect(Promise.all([first, duplicate, second])).resolves.toEqual([undefined, undefined, undefined]);
    });
});
