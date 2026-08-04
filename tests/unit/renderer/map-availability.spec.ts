// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentPresence } from "@main/content/content-state";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { settledListeners, mapAddedListeners, mapDeletedListeners, installedOnDisk, table } = vi.hoisted(() => {
    const settledListeners: Array<(refs: ContentPresence[]) => void> = [];
    const mapAddedListeners: Array<(springName: string) => void> = [];
    const mapDeletedListeners: Array<(springName: string) => void> = [];

    // Dexie stands in as a table that answers everything with nothing, since none of this is about the db.
    const table = () => ({
        toArray: async () => [],
        count: async () => 0,
        where: () => ({ equals: () => ({ modify: vi.fn() }) }),
        toCollection: () => ({ modify: async () => 0 }),
    });

    return { settledListeners, mapAddedListeners, mapDeletedListeners, installedOnDisk: { names: [] as string[] }, table };
});

vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/store/db", () => ({ db: { maps: table(), nonLiveMaps: table() } }));
vi.mock("@renderer/store/contents.store", () => ({
    onContentSettled: (callback: (refs: ContentPresence[]) => void) => settledListeners.push(callback),
}));
vi.stubGlobal(
    "window",
    Object.assign(window, {
        maps: {
            onMapAdded: (callback: (springName: string) => void) => mapAddedListeners.push(callback),
            onMapDeleted: (callback: (springName: string) => void) => mapDeletedListeners.push(callback),
            getInstalledMapNames: async () => installedOnDisk.names,
            fetchMissingMapImages: vi.fn(),
        },
    })
);

import { initMapsStore, mapsStore } from "@renderer/store/maps.store";

const map = (id: string, present: boolean): ContentPresence => ({ type: "map", id, present });

describe("map availability", () => {
    let settled: (refs: ContentPresence[]) => void;

    beforeEach(async () => {
        settledListeners.length = 0;
        mapAddedListeners.length = 0;
        mapDeletedListeners.length = 0;
        installedOnDisk.names = [];
        mapsStore.isInitialized = false;
        mapsStore.availableMapNames = new Set();

        await initMapsStore();
        settled = settledListeners[0];
    });

    it("marks a downloaded map available", () => {
        settled([map("Quicksilver 1.2", true)]);

        expect(mapsStore.availableMapNames.has("Quicksilver 1.2")).toBe(true);
    });

    // A settled ref is one the queue is done with, which covers removals as much as downloads. Reading it
    // as "arrived" put deleted maps back into the list.
    it("stops listing a removed map", () => {
        settled([map("Quicksilver 1.2", true)]);

        settled([map("Quicksilver 1.2", false)]);

        expect(mapsStore.availableMapNames.has("Quicksilver 1.2")).toBe(false);
    });

    it("leaves other content types alone", () => {
        settled([{ type: "engine", id: "2025.06.21", present: true }]);

        expect(mapsStore.availableMapNames.size).toBe(0);
    });

    it("takes the watcher's word too", () => {
        mapAddedListeners.forEach((listener) => listener("Tabula 1.0"));
        expect(mapsStore.availableMapNames.has("Tabula 1.0")).toBe(true);

        mapDeletedListeners.forEach((listener) => listener("Tabula 1.0"));
        expect(mapsStore.availableMapNames.has("Tabula 1.0")).toBe(false);
    });
});
