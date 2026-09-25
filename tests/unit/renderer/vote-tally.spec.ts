// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { Lobby } from "@renderer/model/lobby";
import { tallyVote } from "@renderer/utils/vote-tally";

type Vote = NonNullable<Lobby["currentVote"]>;
type Ballot = Vote["voters"][string]["vote"];

function makeVote(ballots: Partial<Record<Ballot, number>>, quorum: number, majority = 0.501): Vote {
    const voters: Vote["voters"] = {};
    let n = 0;
    for (const [ballot, count] of Object.entries(ballots) as [Ballot, number][]) {
        for (let i = 0; i < count; i++) voters[`user-${n++}`] = { vote: ballot };
    }
    return { id: "vote-1", action: { type: "start" }, initiator: "user-0", voters, until: 0, quorum, majority };
}

describe("tallyVote", () => {
    it("counts abstains towards quorum but not towards the bar", () => {
        const tally = tallyVote(makeVote({ pending: 4, abstain: 5, yes: 3, no: 1 }, 9));
        expect(tally).toMatchObject({ cast: 9, quorumMet: true, majority: 0.501 });
        expect(tally.bar!.yes).toBeCloseTo(3 / 8);
        expect(tally.bar!.no).toBeCloseTo(1 / 8);
    });

    it("does not count pending voters towards quorum", () => {
        const tally = tallyVote(makeVote({ pending: 5, abstain: 5, yes: 3, no: 1 }, 10));
        expect(tally.cast).toBe(9);
        expect(tally.quorumMet).toBe(false);
    });

    it("does not fill the bar from the initiator's vote alone", () => {
        const tally = tallyVote(makeVote({ yes: 1, pending: 2 }, 2));
        expect(tally.bar!.yes).toBeCloseTo(1 / 3);
        expect(tally.bar!.no).toBe(0);
    });

    it("leaves abstainers out of the bar", () => {
        const tally = tallyVote(makeVote({ yes: 1, no: 1, abstain: 2 }, 4));
        expect(tally.bar).toEqual({ yes: 0.5, no: 0.5 });
    });

    it("has no from the right crossing the majority line once yes can no longer reach it", () => {
        // 1 yes + 1 pending can reach at most 2/5, below 0.501, so no's left edge (1 - 3/5) sits past the line.
        const tally = tallyVote(makeVote({ yes: 1, no: 3, pending: 1 }, 3));
        expect(1 - tally.bar!.no).toBeLessThan(tally.majority);
    });

    it("has no bar when everyone abstained", () => {
        expect(tallyVote(makeVote({ abstain: 3 }, 3)).bar).toBeNull();
    });

    it("raises the cast count when someone abstains", () => {
        const before = tallyVote(makeVote({ yes: 2, no: 2, pending: 1 }, 5));
        const after = tallyVote(makeVote({ yes: 2, no: 2, abstain: 1 }, 5));
        expect(after.cast).toBe(before.cast + 1);
    });
});
