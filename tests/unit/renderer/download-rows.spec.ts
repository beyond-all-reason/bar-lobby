// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentState, ContentStatus } from "@main/content/content-state";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { onChanged, state } = vi.hoisted(() => ({ onChanged: vi.fn(), state: vi.fn() }));

vi.mock("@renderer/i18n", () => ({
    useTypedI18n: () => ({ t: (key: string, values: Record<string, unknown>) => `${key}:${JSON.stringify(values)}` }),
}));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/store/downloads.store", () => ({ downloadsStore: { updateDownloads: [] } }));
vi.stubGlobal("window", Object.assign(window, { content: { state, onChanged, onPoolPrefetch: vi.fn() } }));

import { useDownloadProgress } from "@renderer/composables/useDownloadProgress";
import { contentsStore, initContentsStore } from "@renderer/store/contents.store";

const BATCH = "Mariposa Island v2.4.1, Mithril Mountain v2.0.1, Paradise_Lost_V4, Pools of Ilys 1.1.2";

function map(id: string, status: ContentStatus, currentBytes: number, transfer?: string): ContentState {
    return { type: "map", id, status, currentBytes, totalBytes: 348_600_000, progress: currentBytes / 348_600_000, attempts: 1, transfer };
}

describe("download rows", () => {
    let push: (state: ContentState[]) => void;
    let rows: () => ReturnType<typeof useDownloadProgress>["downloadRows"]["value"];
    let percent: () => number;

    beforeEach(async () => {
        state.mockResolvedValue([]);
        onChanged.mockReset();
        contentsStore.isInitialized = false;
        contentsStore.settledCount = 0;
        contentsStore.inFlight = [];
        contentsStore.poolPrefetch = null;

        await initContentsStore();
        push = onChanged.mock.calls[0][0];
        rows = () => useDownloadProgress().downloadRows.value;
        percent = () => useDownloadProgress().totalDownloadPercent.value;
    });

    // pr-downloader hands back one set of figures for the whole invocation, so a row per ref showed four
    // maps each claiming the batch's total size, moving in lockstep, each reporting the batch's speed.
    it("shows one row for content that came down as a single transfer", () => {
        const ids = BATCH.split(", ");
        push(ids.map((id) => map(id, "acquiring", 34_900_000, BATCH)));

        expect(rows()).toHaveLength(1);
        expect(rows()[0].count).toBe(4);
        expect(rows()[0].currentBytes).toBe(34_900_000);
    });

    it("leaves a lone transfer as its own row under its own name", () => {
        push([map("Quicksilver Remake 1.24", "acquiring", 100, undefined)]);

        expect(rows()).toHaveLength(1);
        expect(rows()[0].name).toBe("Quicksilver Remake 1.24");
        expect(rows()[0].count).toBe(1);
    });

    it("keeps separate transfers apart", () => {
        push([map("a", "acquiring", 10, "a, b"), map("b", "acquiring", 10, "a, b"), map("c", "acquiring", 20, "c, d"), map("d", "acquiring", 20, "c, d")]);

        expect(rows()).toHaveLength(2);
        expect(rows().map((row) => row.count)).toEqual([2, 2]);
    });

    // The rows are for reading; the figure has to keep weighing every piece of content asked for, or
    // collapsing four refs into one row would quarter what the navbar reports.
    it("does not let grouping change the overall figure", () => {
        const ids = BATCH.split(", ");
        push(ids.map((id) => map(id, "acquiring", 348_600_000, BATCH)));

        expect(rows()).toHaveLength(1);
        expect(percent()).toBeCloseTo(1);
    });
});
