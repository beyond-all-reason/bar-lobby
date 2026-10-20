// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentRef, contentRefKey } from "@main/content/content-ref";
import { ContentPresence, ContentProgress, ContentState, hasFailed } from "@main/content/content-state";
import { createSettledCounter, createSettledTracker, SettledContent, SettledOutcome } from "@main/content/content-progress";
import { notificationsApi } from "@renderer/api/notifications";
import { isEditionRefusal } from "@shared/edition";
import { reactive } from "vue";

export const contentsStore: {
    isInitialized: boolean;
    inFlight: ContentState[];
    // Bumped on every change so anything deriving from installed content can re-ask. The main process
    // only pushes what is in flight, not what is installed, so presence has to be queried.
    revision: number;
    // Relocating the assets directory moves the files content lives in, so acquiring anything while
    // that runs has nowhere stable to land.
    isPathChanging: boolean;
    // Warming the pool is not tied to any one piece of content, so it is not part of inFlight.
    poolPrefetch: ContentProgress | null;
    // Content that landed this run, counted on both sides of the fraction so it does not drop as content
    // leaves inFlight. Held while a failure is unretried and not dismissed, so the share it takes up stays put.
    settledCount: number;
    // Downloads this session is done with and how each ended, so what finished can be named and not
    // just counted. Kept after the queue drains, unlike settledCount's run.
    finishedDownloads: SettledContent[];
} = reactive({
    isInitialized: false,
    inFlight: [],
    revision: 0,
    isPathChanging: false,
    poolPrefetch: null,
    settledCount: 0,
    finishedDownloads: [],
});

export function contentRefs(content: { engines?: string[]; games?: string[]; maps?: string[] }): ContentRef[] {
    return [
        ...(content.engines ?? []).map((id) => ({ type: "engine" as const, id })),
        ...(content.games ?? []).map((id) => ({ type: "game" as const, id })),
        ...(content.maps ?? []).map((id) => ({ type: "map" as const, id })),
    ];
}

export function inFlightFor(refs: ContentRef[]) {
    return contentsStore.inFlight.filter((state) => refs.some((ref) => ref.type === state.type && ref.id === state.id));
}

export async function ensureContent(refs: ContentRef[]) {
    try {
        await window.content.ensure(refs);
    } catch (error) {
        console.error("Failed to acquire content:", refs, error);
        if (!isEditionRefusal(error)) {
            notificationsApi.alert({ text: "Content download failed.", severity: "error" });
        }
    }
}

export async function removeContent(refs: ContentRef[]) {
    try {
        await window.content.remove(refs);
    } catch (error) {
        console.error("Failed to remove content:", refs, error);
        notificationsApi.alert({ text: "Content removal failed.", severity: "error" });
    }
}

// Held outside init so the list can be cleared from the popover. Clearing the store's copy alone would
// last only until the next change came in. Made afresh by init.
let settledTracker = createSettledTracker();
let countSettled = createSettledCounter();

// A failure the user cleared has been dismissed, so the counter is shown only the failures still
// listed. Otherwise a dismissed failure would hold the run's tally open into the next one.
function withoutDismissedFailures(states: ContentState[]) {
    const listed = new Set(contentsStore.finishedDownloads.filter(({ outcome }) => outcome === "failed").map(({ state }) => contentRefKey(state)));

    return states.filter((state) => !hasFailed(state) || listed.has(contentRefKey(state)));
}

export function clearFinishedDownloads(outcome: SettledOutcome) {
    // What finished is dismissed from the figure as well as the list, so a run left with only its
    // failures reads as entirely failed.
    if (outcome === "complete") {
        countSettled.forget(contentsStore.finishedDownloads.filter((entry) => entry.outcome === "complete").map(({ state }) => contentRefKey(state)));
    }

    contentsStore.finishedDownloads = settledTracker.clear(outcome);
    // Counted again against the same snapshot so a run with nothing left in it starts over now, not at
    // the next change, which would be the next run's first.
    contentsStore.settledCount = countSettled(withoutDismissedFailures(contentsStore.inFlight));
}

export async function initContentsStore() {
    if (contentsStore.isInitialized) {
        return;
    }

    contentsStore.inFlight = await window.content.state();

    settledTracker = createSettledTracker();
    countSettled = createSettledCounter();
    // Seed the tracker with what is already in flight, so it notices that content leaving too.
    contentsStore.finishedDownloads = settledTracker.track(contentsStore.inFlight);
    window.content.onChanged((state) => {
        // Tracked first: the counter goes by which failures the tracker still lists.
        contentsStore.finishedDownloads = settledTracker.track(state);
        contentsStore.settledCount = countSettled(withoutDismissedFailures(state));
        contentsStore.inFlight = state;
        contentsStore.revision++;
    });
    window.content.onPoolPrefetch((downloadInfo) => {
        contentsStore.poolPrefetch = downloadInfo;
    });

    contentsStore.isInitialized = true;
}

export function onContentSettled(callback: (refs: ContentPresence[]) => void) {
    window.content.onSettled(callback);
}
