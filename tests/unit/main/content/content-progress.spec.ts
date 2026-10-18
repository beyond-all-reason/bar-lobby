// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentState, ContentStatus } from "@main/content/content-state";
import { createSettledCounter, createSettledTracker, SettledContent } from "@main/content/content-progress";
import { describe, expect, it } from "vitest";

function map(id: string, status: ContentStatus): ContentState {
    return { type: "map", id, status, currentBytes: 0, totalBytes: 100, progress: 0, attempts: 1 };
}

describe("settled counter", () => {
    it("counts content that has left the change stream", () => {
        const count = createSettledCounter();

        count([map("a", "acquiring"), map("b", "acquiring")]);

        expect(count([map("b", "acquiring")])).toBe(1);
    });

    it("does not count a failure as content that landed", () => {
        const count = createSettledCounter();

        count([map("a", "acquiring"), map("bad", "acquiring")]);

        expect(count([map("a", "acquiring"), map("bad", "failed")])).toBe(0);
    });

    // Content can be asked for again after it has been removed, and counting departures rather than
    // content meant the same map could account for itself twice inside one run.
    it("counts a ref once however many times it comes back", () => {
        const count = createSettledCounter();

        count([map("a", "acquiring"), map("b", "acquiring")]);
        expect(count([map("b", "acquiring")])).toBe(1);

        // a is asked for again while b is still going, and lands a second time.
        count([map("a", "acquiring"), map("b", "acquiring")]);

        expect(count([map("b", "acquiring")])).toBe(1);
    });

    it("starts over once nothing is outstanding", () => {
        const count = createSettledCounter();

        count([map("a", "acquiring")]);
        expect(count([])).toBe(0);
    });

    // A failure outlives the run, so the next thing asked for would otherwise be counted against a total
    // that still carried the last run's tally.
    it("holds its tally while a failure is still unretried", () => {
        const count = createSettledCounter();

        count([map("a", "acquiring"), map("bad", "acquiring")]);

        expect(count([map("bad", "failed")])).toBe(1);
    });
});

describe("settled tracker", () => {
    function outcomes(settled: SettledContent[]) {
        return settled.map(({ state, outcome }) => `${state.id}:${outcome}`);
    }

    it("returns the last state of content that has left the change stream", () => {
        const { track } = createSettledTracker();

        track([map("a", "acquiring"), map("b", "acquiring")]);

        expect(outcomes(track([map("b", "acquiring")]))).toEqual(["a:complete"]);
    });

    it("tracks a failure as failed, not complete", () => {
        const { track } = createSettledTracker();

        track([map("a", "acquiring"), map("bad", "acquiring")]);

        expect(outcomes(track([map("a", "acquiring"), map("bad", "failed")]))).toEqual(["bad:failed"]);
    });

    // The queue drops a ref the moment its operation ends and the failure is only recorded after, so the
    // stream sees the ref gone, which reads as landed, before it sees it fail.
    it("corrects content taken for landed once it is reported as failed", () => {
        const { track } = createSettledTracker();

        track([map("a", "acquiring"), map("bad", "acquiring")]);
        expect(outcomes(track([map("a", "acquiring")]))).toEqual(["bad:complete"]);

        expect(outcomes(track([map("a", "acquiring"), map("bad", "failed")]))).toEqual(["bad:failed"]);
    });

    it("keeps a corrected failure in the place it first landed in", () => {
        const { track } = createSettledTracker();

        track([map("bad", "acquiring"), map("b", "acquiring"), map("c", "acquiring")]);
        track([map("b", "acquiring"), map("c", "acquiring")]);
        track([map("c", "acquiring")]);

        expect(outcomes(track([map("c", "acquiring"), map("bad", "failed")]))).toEqual(["bad:failed", "b:complete"]);
    });

    it("drops a failure once it is asked for again, and tracks how the retry ended", () => {
        const { track } = createSettledTracker();

        track([map("bad", "acquiring")]);
        track([map("bad", "failed")]);

        expect(track([map("bad", "queued")])).toEqual([]);
        track([map("bad", "acquiring")]);
        expect(outcomes(track([]))).toEqual(["bad:complete"]);
    });

    // A queued ref does not say whether it is waiting to be fetched or removed, and a removal leaving
    // the stream is not a download that landed.
    it("does not track a removal", () => {
        const { track } = createSettledTracker();

        track([map("a", "queued")]);
        track([map("a", "removing")]);

        expect(track([])).toEqual([]);
    });

    it("does not track a removal that failed", () => {
        const { track } = createSettledTracker();

        track([map("a", "queued")]);
        track([map("a", "removing")]);
        track([]);

        expect(track([map("a", "failed")])).toEqual([]);
    });

    it("drops a download once it is removed, and does not bring it back", () => {
        const { track } = createSettledTracker();

        track([map("a", "acquiring")]);
        expect(outcomes(track([]))).toEqual(["a:complete"]);

        expect(track([map("a", "queued")])).toEqual([]);
        expect(track([map("a", "removing")])).toEqual([]);
        expect(track([])).toEqual([]);
    });

    it("tracks a download that was queued before it was acquired", () => {
        const { track } = createSettledTracker();

        track([map("a", "queued")]);
        track([map("a", "acquiring")]);

        expect(outcomes(track([]))).toEqual(["a:complete"]);
    });

    // Otherwise the list would empty the moment the last download ended, unlike the counter's tally,
    // which is only wanted while something is running.
    it("keeps what landed after the queue has drained", () => {
        const { track } = createSettledTracker();

        track([map("a", "acquiring")]);

        expect(outcomes(track([]))).toEqual(["a:complete"]);
    });

    it("drops content that is asked for again until it lands again", () => {
        const { track } = createSettledTracker();

        track([map("a", "acquiring"), map("b", "acquiring")]);
        track([map("b", "acquiring")]);

        expect(track([map("a", "acquiring"), map("b", "acquiring")])).toEqual([]);
        expect(outcomes(track([map("b", "acquiring")]))).toEqual(["a:complete"]);
    });

    it("keeps the order content landed in", () => {
        const { track } = createSettledTracker();

        track([map("a", "acquiring"), map("b", "acquiring"), map("c", "acquiring")]);
        track([map("b", "acquiring"), map("c", "acquiring")]);

        expect(outcomes(track([map("c", "acquiring")]))).toEqual(["a:complete", "b:complete"]);
    });

    it("clears one outcome and leaves the other", () => {
        const { track, clear } = createSettledTracker();

        track([map("a", "acquiring"), map("bad", "acquiring")]);
        track([map("bad", "failed")]);

        expect(outcomes(clear("complete"))).toEqual(["bad:failed"]);
        expect(outcomes(track([map("bad", "failed")]))).toEqual(["bad:failed"]);
    });

    // The failure is still in the change stream after it is cleared, and every snapshot carries it.
    it("does not bring back a cleared failure", () => {
        const { track, clear } = createSettledTracker();

        track([map("bad", "acquiring")]);
        track([map("bad", "failed")]);

        expect(clear("failed")).toEqual([]);
        expect(track([map("bad", "failed")])).toEqual([]);
    });

    it("tracks cleared content again once it is downloaded again", () => {
        const { track, clear } = createSettledTracker();

        track([map("bad", "acquiring")]);
        track([map("bad", "failed")]);
        clear("failed");

        track([map("bad", "queued")]);
        track([map("bad", "acquiring")]);

        expect(outcomes(track([]))).toEqual(["bad:complete"]);
    });
});
