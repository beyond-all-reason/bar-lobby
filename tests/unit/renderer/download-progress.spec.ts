// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentState, ContentStatus } from "@main/content/content-state";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { onChanged, state } = vi.hoisted(() => ({ onChanged: vi.fn(), state: vi.fn() }));

vi.mock("@renderer/i18n", () => ({ useTypedI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/store/downloads.store", () => ({ downloadsStore: { updateDownloads: [] } }));
vi.stubGlobal("window", Object.assign(window, { content: { state, onChanged, onPoolPrefetch: vi.fn() } }));

import { useDownloadProgress } from "@renderer/composables/useDownloadProgress";
import { contentsStore, initContentsStore } from "@renderer/store/contents.store";

function map(id: string, status: ContentStatus, currentBytes: number, totalBytes: number): ContentState {
    return { type: "map", id, status, currentBytes, totalBytes, progress: 0, attempts: 1 };
}

const queued = (id: string) => map(id, "queued", 0, 0);
const acquiring = (id: string, currentBytes: number, totalBytes: number) => map(id, "acquiring", currentBytes, totalBytes);

describe("aggregate download progress", () => {
    let push: (state: ContentState[]) => void;
    let percent: () => number;
    let failedPercent: () => number;

    beforeEach(async () => {
        state.mockResolvedValue([]);
        onChanged.mockReset();
        contentsStore.isInitialized = false;
        contentsStore.settledCount = 0;
        contentsStore.inFlight = [];
        contentsStore.poolPrefetch = null;

        await initContentsStore();
        push = onChanged.mock.calls[0][0];
        percent = () => useDownloadProgress().totalDownloadPercent.value;
        failedPercent = () => useDownloadProgress().failedDownloadPercent.value;
    });

    it("counts content rather than bytes", () => {
        push([queued("a"), queued("b"), acquiring("c", 50, 100)]);
        expect(percent()).toBeCloseTo(0.5 / 3);

        push([acquiring("c", 100, 100)]);
        expect(percent()).toBeCloseTo((2 + 1) / 3);
    });

    it("reads as empty before anything reports a size", () => {
        push([queued("a"), queued("b")]);

        expect(percent()).toBe(0);
    });

    // Queued content reveals its size only when picked up, so the figure must not drop as slots free.
    it("never goes backwards while a batch drains three at a time", () => {
        const sizes: Record<string, number> = { a: 100, b: 900, c: 50, d: 4000, e: 20 };
        const ids = ["a", "b", "c", "d", "e"];
        const done: string[] = [];
        let highest = 0;

        const observe = () => {
            const current = percent();
            expect(current).toBeGreaterThanOrEqual(highest);
            highest = current;
        };

        push(ids.map(queued));
        observe();

        while (done.length < ids.length) {
            const remaining = ids.filter((id) => !done.includes(id));
            const active = remaining.slice(0, 3);

            for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
                push([...active.map((id) => acquiring(id, sizes[id] * fraction, sizes[id])), ...remaining.slice(3).map(queued)]);
                observe();
            }

            done.push(...active);
        }

        expect(highest).toBeCloseTo(1);
    });

    // What failed takes its own share above what landed, so the two together still fill and the part
    // that did not make it is what the navbar shows instead of a bar that stops short for no stated
    // reason.
    it("gives what failed its own share above what landed", () => {
        const ids = ["a", "b", "c", "d"];
        push(ids.map((id) => acquiring(id, 50, 100)));
        expect(percent()).toBeCloseTo(0.5);
        expect(failedPercent()).toBe(0);

        push([acquiring("a", 100, 100), acquiring("b", 100, 100), acquiring("c", 100, 100), map("d", "failed", 50, 100)]);

        expect(percent()).toBeCloseTo(0.75);
        expect(failedPercent()).toBeCloseTo(0.25);
    });

    // contentAPI keeps a failure until its ref is asked for again, and the content that did land leaves
    // inFlight well before that, so the share has to survive the run it belongs to.
    it("holds both shares once everything else has stopped", () => {
        push([acquiring("a", 100, 100), acquiring("b", 100, 100), acquiring("c", 100, 100), map("d", "failed", 50, 100)]);

        push([map("d", "failed", 50, 100)]);

        expect(percent()).toBeCloseTo(0.75);
        expect(failedPercent()).toBeCloseTo(0.25);
    });

    it("clears the failed share when the content is asked for again", () => {
        push([acquiring("a", 100, 100), map("b", "failed", 50, 100)]);
        push([map("b", "failed", 50, 100)]);

        push([map("b", "queued", 0, 0)]);

        expect(failedPercent()).toBe(0);
    });

    it("empties once a retry settles and nothing is left", () => {
        push([acquiring("a", 100, 100), map("b", "failed", 50, 100)]);
        push([map("b", "queued", 0, 0)]);

        push([]);

        expect(percent()).toBe(0);
        expect(failedPercent()).toBe(0);
        expect(contentsStore.settledCount).toBe(0);
    });

    // How far it got before giving up says nothing about how much of the run it was.
    it("does not size a failure by the bytes it managed", () => {
        push([acquiring("a", 100, 100), map("b", "failed", 1, 100)]);

        expect(failedPercent()).toBeCloseTo(0.5);
    });

    it("does not count an old failure against the next run", () => {
        push([acquiring("a", 100, 100), acquiring("b", 50, 100)]);
        push([map("b", "failed", 50, 100)]);

        push([map("b", "failed", 50, 100), acquiring("c", 50, 100)]);

        expect(percent()).toBeCloseTo(0.5);
    });

    // The queue hands pr-downloader a window of refs at a time and the ones that land leave inFlight
    // straight away, so the figure has to survive each handover rather than restart from what is left.
    it("never drops at a batch handover", () => {
        const BATCH = 4;
        const ids = Array.from({ length: 20 }, (_, index) => `map-${index}`);
        let highest = 0;

        const observe = () => {
            const current = percent();
            expect(current).toBeGreaterThanOrEqual(highest);
            highest = current;
        };

        push(ids.map(queued));
        observe();

        for (let landed = 0; landed < ids.length; landed += BATCH) {
            const outstanding = ids.slice(landed);

            for (const fraction of [0, 0.5, 1]) {
                push(outstanding.map((id, index) => (index < BATCH ? acquiring(id, 100 * fraction, 100) : queued(id))));
                observe();
            }
        }

        expect(highest).toBeCloseTo(1);
    });

    it("ignores removals", () => {
        push([map("a", "removing", 0, 0)]);

        expect(percent()).toBe(0);
        expect(contentsStore.settledCount).toBe(0);
    });

    it("starts the next batch from zero", () => {
        push([acquiring("a", 100, 100)]);
        push([]);

        expect(contentsStore.settledCount).toBe(0);
        expect(percent()).toBe(0);
    });
});
