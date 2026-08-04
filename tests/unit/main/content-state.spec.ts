// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentState, ContentStatus, isInProgress, isOwed, isUnsettled } from "@main/content/content-state";
import { describe, expect, it } from "vitest";

function state(status: ContentStatus): ContentState {
    return { type: "map", id: "Quicksilver 1.2", status, currentBytes: 0, totalBytes: 0, progress: 0, attempts: 1 };
}

// Every consumer picks one of these to answer a different question, and picking the wrong one is the
// mistake this table exists to make obvious. The failed row is where they disagree most.
const expected: Record<ContentStatus, { unsettled: boolean; inProgress: boolean; owed: boolean }> = {
    queued: { unsettled: true, inProgress: true, owed: true },
    acquiring: { unsettled: true, inProgress: true, owed: true },
    removing: { unsettled: true, inProgress: false, owed: false },
    failed: { unsettled: false, inProgress: false, owed: true },
};

describe("content state predicates", () => {
    for (const [status, answers] of Object.entries(expected) as Array<[ContentStatus, (typeof expected)[ContentStatus]]>) {
        it(`describes ${status}`, () => {
            expect(isUnsettled(state(status))).toBe(answers.unsettled);
            expect(isInProgress(state(status))).toBe(answers.inProgress);
            expect(isOwed(state(status))).toBe(answers.owed);
        });
    }
});
