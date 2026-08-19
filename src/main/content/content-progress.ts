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
