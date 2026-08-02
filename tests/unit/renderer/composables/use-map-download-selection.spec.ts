// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { useMapDownloadSelection } from "@renderer/composables/useMapDownloadSelection";

const { queueMapDownloads } = vi.hoisted(() => ({ queueMapDownloads: vi.fn() }));

vi.mock("@renderer/store/maps.store", () => ({
    mapsStore: { availableMapNames: new Set<string>() },
    queueMapDownloads,
}));
vi.mock("@renderer/store/downloads.store", () => ({
    downloadsStore: {
        mapDownloadQueue: [{ springName: "map-queued", status: "queued" }],
    },
}));

describe("useMapDownloadSelection", () => {
    it("submits selected eligible maps in their catalog order and clears the selection", () => {
        const maps = ref([
            { springName: "map-b", isInstalled: false },
            { springName: "map-installed", isInstalled: true },
            { springName: "map-a", isInstalled: false },
            { springName: "map-queued", isInstalled: false },
        ]);
        const selection = useMapDownloadSelection(maps);

        selection.toggle("map-a");
        selection.toggle("map-b");
        selection.submit();

        expect(queueMapDownloads).toHaveBeenCalledWith(["map-b", "map-a"]);
        expect(selection.selectedMapNames.value).toEqual(new Set());
    });
});
