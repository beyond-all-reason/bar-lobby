// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentRef } from "@main/content/content-ref";
import { EditionRefusal } from "@shared/edition";

export type ContentStatus = "queued" | "acquiring" | "removing" | "failed";

export type ContentProgress = {
    currentBytes: number;
    totalBytes: number;
    progress: number;
    phase?: "downloading" | "extracting";
};

// Only content with something happening to it appears here: absent means settled, installed comes from
// isPresent. attempts counts tries at the current download, reset when the content is asked for again.
export type ContentState = ContentRef & ContentProgress & { status: ContentStatus; attempts: number };

// Whether content is installed, read from disk at the moment it is reported. Shared by both signals
// that announce a change so a listener does not have to know which one it heard.
export type ContentPresence = ContentRef & { present: boolean };

// Content this edition will not acquire, and why, as a code the renderer words for itself. An error
// thrown in main reaches the renderer as its message alone, so the reason travels as data instead.
export type RefusedContent = { refusal: EditionRefusal; refs: ContentRef[] };

// Three different questions get asked of a snapshot and the answers differ, so each one is named. Reading
// status directly at a call site is how they get confused for each other.

// The queue still has this in hand, whichever operation. A failure is a result kept for the user to see,
// not work in progress.
export function isUnsettled(state: ContentState) {
    return state.status !== "failed";
}

// Bytes are moving, or about to.
export function isInProgress(state: ContentState) {
    return state.status === "queued" || state.status === "acquiring";
}

// Accepted but not started. Nothing is known about how it will be fetched yet, including whether it
// will come down on its own or as part of a batch.
export function isQueued(state: ContentState) {
    return state.status === "queued";
}

// Being fetched. Queued does not say which operation is waiting, so this is the first point at which
// content is known to be a download.
export function isAcquiring(state: ContentState) {
    return state.status === "acquiring";
}

// Given up on, and kept that way until the content is asked for again.
export function hasFailed(state: ContentState) {
    return state.status === "failed";
}

export type ContentReporter = {
    progress(ids: string[], progress: ContentProgress): void;
    attempt(ids: string[]): void;
};
