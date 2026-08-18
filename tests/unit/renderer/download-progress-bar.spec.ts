// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentState, ContentStatus } from "@main/content/content-state";
import DownloadProgress from "@renderer/components/common/DownloadProgress.vue";
import { contentsStore } from "@renderer/store/contents.store";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@renderer/i18n", () => ({ useTypedI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));

const BATCH = 4;
const names = Array.from({ length: 20 }, (_, index) => `map-${index}`);

function state(id: string, status: ContentStatus, progress: number): ContentState {
    return { type: "map", id, status, currentBytes: progress * 100, totalBytes: 100, progress, attempts: 1 };
}

// What the queue pushes while it works through a list: a window of `acquiring` refs sharing the batch's
// figures, the untouched ones still `queued`, and everything already done simply gone from inFlight.
function afterLanded(landed: number, batchProgress: number) {
    const outstanding = names.slice(landed);

    return outstanding.map((id, index) => (index < BATCH ? state(id, "acquiring", batchProgress) : state(id, "queued", 0)));
}

function percentOf(wrapper: ReturnType<typeof mountBar>) {
    return wrapper.findComponent({ name: "Progress" }).props("percent") as number;
}

function mountBar() {
    return mount(DownloadProgress, {
        props: { maps: names, height: 100 },
        global: {
            stubs: {
                Progress: { name: "Progress", props: ["percent", "percentStr", "height"], template: "<div />" },
            },
        },
    });
}

describe("DownloadProgress", () => {
    beforeEach(() => {
        contentsStore.inFlight = [];
    });

    it("reads as empty before anything has been picked up", async () => {
        const wrapper = mountBar();
        contentsStore.inFlight = afterLanded(0, 0);
        await wrapper.vm.$nextTick();

        expect(percentOf(wrapper)).toBeCloseTo(0);
    });

    // The first batch finishing used to drop the figure back to zero, because the refs that landed left
    // inFlight and the average only covered what was still outstanding.
    it("does not fall back when a batch finishes", async () => {
        const wrapper = mountBar();

        contentsStore.inFlight = afterLanded(0, 1);
        await wrapper.vm.$nextTick();
        const beforeHandover = percentOf(wrapper);

        contentsStore.inFlight = afterLanded(BATCH, 0);
        await wrapper.vm.$nextTick();

        expect(percentOf(wrapper)).toBeCloseTo(beforeHandover);
        expect(beforeHandover).toBeCloseTo(BATCH / names.length);
    });

    it("never goes backwards across every batch of the run", async () => {
        const wrapper = mountBar();
        let highest = 0;

        for (let landed = 0; landed < names.length; landed += BATCH) {
            for (const batchProgress of [0, 0.5, 1]) {
                contentsStore.inFlight = afterLanded(landed, batchProgress);
                await wrapper.vm.$nextTick();

                const current = percentOf(wrapper);
                expect(current).toBeGreaterThanOrEqual(highest);
                highest = current;
            }
        }

        expect(highest).toBeCloseTo(1);
    });

    it("stays within bounds when a transfer reports more than its own total", async () => {
        const wrapper = mountBar();
        // pr-downloader reports file counts and bytes on the same channel, so a reading can exceed 100%.
        contentsStore.inFlight = names.map((id, index) => (index < BATCH ? state(id, "acquiring", 3) : state(id, "queued", 0)));
        await wrapper.vm.$nextTick();

        expect(percentOf(wrapper)).toBeLessThanOrEqual(1);
        expect(percentOf(wrapper)).toBeCloseTo(BATCH / names.length);
    });

    // Subtracting what is still moving from what was asked for cannot tell a failure from an arrival, so
    // a set with a couple of dead maps in it used to march to the top and claim everything landed.
    it("does not count content that failed as content that arrived", async () => {
        const wrapper = mountBar();
        const failedCount = 2;
        const outstanding = names.slice(failedCount);

        contentsStore.inFlight = [
            ...names.slice(0, failedCount).map((id) => state(id, "failed", 0)),
            ...outstanding.map((id, index) => (index < BATCH ? state(id, "acquiring", 1) : state(id, "queued", 0))),
        ];
        await wrapper.vm.$nextTick();

        // Four of the eighteen that can still arrive are done; the two dead ones count for nothing.
        expect(percentOf(wrapper)).toBeCloseTo(BATCH / names.length);
    });

    it("counts content that was already installed rather than showing it as outstanding", async () => {
        const wrapper = mountBar();
        contentsStore.inFlight = afterLanded(names.length / 2, 0);
        await wrapper.vm.$nextTick();

        expect(percentOf(wrapper)).toBeCloseTo(0.5);
    });
});
