// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

const { liveMaps, nonLiveMaps, installedNames, downloadMaps, alert } = vi.hoisted(() => {
    const tableOf = () => {
        const rows = new Map<string, Record<string, unknown>>();
        return {
            rows,
            get: async (key: string) => rows.get(key),
            put: async (row: { springName: string }) => void rows.set(row.springName, { ...row }),
            update: async (key: string, changes: Record<string, unknown>) => {
                const row = rows.get(key);
                if (row) Object.assign(row, changes);
            },
        };
    };

    return {
        liveMaps: tableOf(),
        nonLiveMaps: tableOf(),
        installedNames: vi.fn<() => Promise<string[]>>(),
        downloadMaps: vi.fn<(springNames: string[]) => Promise<void>>(),
        alert: vi.fn(),
    };
});

vi.mock("@renderer/store/db", () => ({ db: { maps: liveMaps, nonLiveMaps } }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert } }));
vi.mock("@renderer/store/contents.store", () => ({ onContentSettled: vi.fn() }));
vi.stubGlobal("window", Object.assign(window, { maps: { downloadMaps, getInstalledMapNames: installedNames } }));

const { downloadMap, downloadMaps: downloadMapsInStore } = await import("@renderer/store/maps.store");

describe("map batch download", () => {
    beforeEach(() => {
        liveMaps.rows.clear();
        nonLiveMaps.rows.clear();
        liveMaps.rows.set("Live Map", { springName: "Live Map", isInstalled: false, isDownloading: false });
        installedNames.mockReset();
        downloadMaps.mockReset();
        alert.mockReset();
    });

    it("downloads a single map as a batch of one", async () => {
        downloadMaps.mockResolvedValue();
        installedNames.mockResolvedValue(["Live Map"]);

        await downloadMap("Live Map");

        expect(downloadMaps).toHaveBeenCalledExactlyOnceWith(["Live Map"]);
        expect(liveMaps.rows.get("Live Map")).toMatchObject({ isInstalled: true, isDownloading: false });
    });

    it("marks the maps that landed installed when another in the batch fails", async () => {
        downloadMaps.mockRejectedValue(new Error("one map failed"));
        installedNames.mockResolvedValue(["Live Map"]);

        await downloadMapsInStore(["Live Map", "Other Map"]);

        expect(liveMaps.rows.get("Live Map")).toMatchObject({ isInstalled: true, isDownloading: false });
        expect(nonLiveMaps.rows.get("Other Map")).toMatchObject({ isInstalled: false, isDownloading: false });
        expect(alert).toHaveBeenCalledOnce();
    });

    it("still stops downloading when the installed check itself fails", async () => {
        downloadMaps.mockRejectedValue(new Error("download failed"));
        installedNames.mockRejectedValue(new Error("check failed"));

        await downloadMapsInStore(["Live Map"]);

        expect(liveMaps.rows.get("Live Map")).toMatchObject({ isInstalled: false, isDownloading: false });
    });
});
