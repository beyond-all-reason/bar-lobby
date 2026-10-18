// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentState, hasFailed, isInProgress } from "@main/content/content-state";
import { contentRefKey } from "@main/content/content-ref";

/**
 * Counts content this run is done with, for anything showing one figure for a set of downloads.
 *
 * The change stream only ever describes work still outstanding, so content vanishes from it the moment
 * it lands. A figure averaged over what is left restarts from nothing every time the queue moves to its
 * next batch, which is why what landed has to be remembered and counted on both sides of the fraction.
 */
export function createSettledCounter() {
    let landed = new Set<string>();
    let previous = new Set<string>();

    return (states: ContentState[]) => {
        const outstanding = new Set(states.filter(isInProgress).map(contentRefKey));
        const failed = new Set(states.filter(hasFailed).map(contentRefKey));

        for (const key of previous) {
            // A failure is not content that landed, and it keeps its own place in the figure instead.
            if (!outstanding.has(key) && !failed.has(key)) {
                landed.add(key);
            }
        }
        previous = outstanding;

        // Nothing moving and nothing failed means this run is over, so the next one starts from zero.
        if (outstanding.size === 0 && failed.size === 0) {
            landed = new Set();
        }

        return landed.size;
    };
}

// How a download this session is done with ended.
export type SettledOutcome = "complete" | "failed";

export type SettledContent = { state: ContentState; outcome: SettledOutcome };

/**
 * Remembers what this session is done downloading and how each one ended, for anything that wants to
 * name what finished rather than just count it.
 *
 * Content that left the change stream without failing landed, the same way the counter above works it
 * out, and is kept in the last state it was seen in. A failure is kept in its failed state. Unlike the
 * counter nothing is forgotten when the queue drains. Content asked for again leaves the list while it
 * is outstanding and comes back with however that attempt ended.
 */
export function createSettledTracker() {
    const settled = new Map<string, SettledContent>();
    let previous = new Map<string, ContentState>();

    return (states: ContentState[]) => {
        const outstanding = new Map(states.filter(isInProgress).map((state): [string, ContentState] => [contentRefKey(state), state]));

        for (const [key, state] of previous) {
            if (!outstanding.has(key)) {
                settled.set(key, { state, outcome: "complete" });
            }
        }

        // A failure is reported a snapshot after the ref has already left the stream, so a ref taken for
        // landed is corrected here. Setting an existing key keeps its place in the order.
        for (const state of states.filter(hasFailed)) {
            settled.set(contentRefKey(state), { state, outcome: "failed" });
        }

        for (const key of outstanding.keys()) {
            settled.delete(key);
        }

        previous = outstanding;

        return [...settled.values()];
    };
}
