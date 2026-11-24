// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { MapData } from "@main/content/maps/map-data";
import { editionFeatures, type EditionFeatures } from "@shared/edition";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { maps, edition } = vi.hoisted(() => {
    const maps = { rows: [] as Partial<MapData>[] };

    return { maps, edition: { features: {} as EditionFeatures } };
});

// Just enough of a Dexie collection for picking one row at an offset.
function collection(rows: () => Partial<MapData>[]) {
    let skip = 0;
    const self = {
        clone: () => collection(rows),
        count: async () => rows().length,
        offset: (n: number) => ((skip = n), self),
        first: async () => rows()[skip],
    };

    return self;
}

vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/store/contents.store", () => ({ onContentSettled: vi.fn() }));
vi.mock("@renderer/store/infos.store", () => ({
    infosStore: {
        get features() {
            return edition.features;
        },
    },
}));
vi.mock("@renderer/store/db", () => ({
    db: {
        maps: {
            toCollection: () => collection(() => maps.rows),
            filter: (predicate: (map: Partial<MapData>) => boolean) => collection(() => maps.rows.filter(predicate)),
        },
    },
}));

import { getRandomMap } from "@renderer/store/maps.store";

describe("getRandomMap", () => {
    beforeEach(() => {
        maps.rows = [
            { springName: "Not Here 1.0", isInstalled: false },
            { springName: "Quicksilver 1.2", isInstalled: true },
            { springName: "Also Not Here 1.0", isInstalled: false },
        ];
    });

    it("picks only installed maps where maps cannot be acquired", async () => {
        edition.features = editionFeatures("steam");

        for (const roll of [0, 0.5, 0.99]) {
            vi.spyOn(Math, "random").mockReturnValue(roll);

            expect((await getRandomMap())?.springName).toBe("Quicksilver 1.2");
        }
    });

    it("picks from every map where maps can be acquired", async () => {
        edition.features = editionFeatures("standalone");
        vi.spyOn(Math, "random").mockReturnValue(0);

        expect((await getRandomMap())?.springName).toBe("Not Here 1.0");
    });

    it("has nothing to pick when no map is installed where maps cannot be acquired", async () => {
        edition.features = editionFeatures("steam");
        maps.rows = maps.rows.filter((map) => !map.isInstalled);

        await expect(getRandomMap()).rejects.toThrow("No maps available");
    });
});
