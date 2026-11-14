// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentState, hasFailed, isAcquiring, isInProgress } from "@main/content/content-state";
import { contentRefKey } from "@main/content/content-ref";

/**
 * Counts content this run is done with, for anything showing one figure for a set of downloads.
 *
 * The change stream only ever describes work still outstanding, so content vanishes from it the moment
 * it lands. A figure averaged over what is left restarts from nothing every time the queue moves to its
 * next batch, which is why what landed has to be remembered and counted on both sides of the fraction.
 *
 * What landed can also be forgotten before the run is over, for a figure that should only describe
 * what is still being shown.
 */
export function createSettledCounter() {
    let landed = new Set<string>();
    let previous = new Set<string>();

    function forget(keys: Iterable<string>) {
        for (const key of keys) {
            landed.delete(key);
        }

        return landed.size;
    }

    const count = (states: ContentState[]) => {
        const outstanding = new Set(states.filter(isInProgress).map(contentRefKey));
        const failed = new Set(states.filter(hasFailed).map(contentRefKey));

        for (const key of previous) {
            // A failure is not content that landed, and it keeps its own place in the figure instead.
            if (!outstanding.has(key) && !failed.has(key)) {
                landed.add(key);
            }
        }
        previous = outstanding;

        // A failure is reported a snapshot after the ref has already left the stream, so content taken
        // for landed is taken back here.
        for (const key of failed) {
            landed.delete(key);
        }

        // Nothing moving and nothing failed means this run is over, so the next one starts from zero.
        if (outstanding.size === 0 && failed.size === 0) {
            landed = new Set();
        }

        return landed.size;
    };

    return Object.assign(count, { forget });
}

// How a download this session is done with ended.
export type SettledOutcome = "complete" | "failed";

export type SettledContent = { state: ContentState; outcome: SettledOutcome };

/**
 * Remembers what this session is done downloading and how each one ended, for anything that wants to
 * name what finished rather than just count it.
 *
 * Only content seen acquiring is followed. A queued ref does not say whether it is to be fetched or
 * removed, so anything that never got as far as acquiring, a removal among them, is not a download
 * and never joins the list. A followed ref that left the change stream without failing landed and is
 * kept in the last state it was seen in; one that failed is kept in its failed state. Unlike the counter
 * nothing is forgotten when the queue drains. Content asked for again, for whatever operation, leaves
 * the list, and comes back only if that request is a download too. What is cleared stays cleared until
 * it is downloaded again.
 */
export function createSettledTracker() {
    const settled = new Map<string, SettledContent>();
    let acquiring = new Map<string, ContentState>();

    function track(states: ContentState[]) {
        const stillAcquiring = new Map<string, ContentState>();

        for (const state of states) {
            const key = contentRefKey(state);

            if (!hasFailed(state)) {
                settled.delete(key);
            }
            if (isAcquiring(state)) {
                stillAcquiring.set(key, state);
            }
        }

        for (const [key, state] of acquiring) {
            if (!stillAcquiring.has(key)) {
                settled.set(key, { state, outcome: "complete" });
            }
        }

        // A failure is reported a snapshot after the ref has already left the stream, so a download taken
        // for landed is corrected here. Setting an existing key keeps its place in the order.
        for (const state of states.filter(hasFailed)) {
            const key = contentRefKey(state);

            if (settled.has(key)) {
                settled.set(key, { state, outcome: "failed" });
            }
        }

        acquiring = stillAcquiring;

        return [...settled.values()];
    }

    // A cleared failure is still in the change stream, but the correction above only rewrites what is
    // already listed, so it is not brought back.
    function clear(outcome: SettledOutcome) {
        for (const [key, entry] of settled) {
            if (entry.outcome === outcome) {
                settled.delete(key);
            }
        }

        return [...settled.values()];
    }

    return { track, clear };
}
