// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Lobby } from "@renderer/model/lobby";

export type VoteTally = {
    /** Votes that count towards quorum: yes, no and abstain. Pending (e.g. AFK) voters do not. */
    cast: number;
    quorum: number;
    quorumMet: boolean;
    /**
     * Bar widths (0-1) over everyone who could still vote yes or no (yes + no + pending), abstainers excluded.
     * Pending voters are the gap between them, so yes reaching the majority line means it holds even if every
     * pending voter says no, and no reaching it from the other side means yes can no longer get there.
     * Null when there is nobody left who could vote yes or no.
     */
    bar: { yes: number; no: number } | null;
    /** Required yes share (0-1) for the vote to pass. */
    majority: number;
};

export function tallyVote(vote: NonNullable<Lobby["currentVote"]>): VoteTally {
    const counts = { yes: 0, no: 0, abstain: 0, pending: 0 };
    for (const voter of Object.values(vote.voters)) {
        counts[voter.vote]++;
    }
    const cast = counts.yes + counts.no + counts.abstain;
    const decisive = counts.yes + counts.no;
    const undecidedOrDecisive = decisive + counts.pending;
    return {
        cast,
        quorum: vote.quorum,
        quorumMet: cast >= vote.quorum,
        bar: undecidedOrDecisive > 0 ? { yes: counts.yes / undecidedOrDecisive, no: counts.no / undecidedOrDecisive } : null,
        majority: vote.majority,
    };
}
