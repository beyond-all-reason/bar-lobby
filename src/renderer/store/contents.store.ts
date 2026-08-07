// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentRef } from "@main/content/content-ref";
import { ContentPresence, ContentProgress, ContentState, isInProgress } from "@main/content/content-state";
import { notificationsApi } from "@renderer/api/notifications";
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
    // Content the queue is done with this run, however it went, counted on both sides of the fraction
    // so it does not drop as content leaves inFlight. Resets once nothing is being worked on.
    settledCount: number;
} = reactive({
    isInitialized: false,
    inFlight: [],
    revision: 0,
    isPathChanging: false,
    poolPrefetch: null,
    settledCount: 0,
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
        notificationsApi.alert({ text: "Content download failed.", severity: "error" });
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

export async function initContentsStore() {
    if (contentsStore.isInitialized) {
        return;
    }

    contentsStore.inFlight = await window.content.state();

    let previous = new Set<string>();
    window.content.onChanged((state) => {
        const outstanding = new Set(state.filter(isInProgress).map((entry) => `${entry.type}:${entry.id}`));
        for (const ref of previous) {
            if (!outstanding.has(ref)) {
                contentsStore.settledCount++;
            }
        }
        previous = outstanding;

        if (!state.some(isInProgress)) {
            contentsStore.settledCount = 0;
        }

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
