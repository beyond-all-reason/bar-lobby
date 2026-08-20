// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentState, ContentStatus } from "@main/content/content-state";
import { createSettledCounter } from "@main/content/content-progress";
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
