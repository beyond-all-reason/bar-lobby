// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentRef } from "@main/content/content-ref";

export type ContentStatus = "queued" | "acquiring" | "removing" | "failed";

export type ContentProgress = {
    currentBytes: number;
    totalBytes: number;
    progress: number;
    phase?: "downloading" | "extracting";
};

// Only content with something happening to it appears here. Anything absent from a snapshot is
// settled, and whether it is installed comes from isPresent rather than from this.
//
// attempts counts tries at the download currently being made, starting at 1 and resetting whenever
// the content is asked for again, so "retrying" is read off it rather than stored separately.
export type ContentState = ContentRef & ContentProgress & { status: ContentStatus; attempts: number };

export type ContentReporter = {
    progress(id: string, progress: ContentProgress): void;
    attempt(id: string): void;
};
