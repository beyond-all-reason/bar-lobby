// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentType } from "@main/content/content-ref";
import { ContentReporter } from "@main/content/content-state";

export interface ContentProvider {
    readonly type: ContentType;
    isPresent(id: string): boolean;
    // Takes a batch because pr-downloader accepts repeatable --download-* flags in one invocation,
    // though the queue currently passes one id at a time: a batched rapid invocation parallelises
    // inside prd, which would put the download count past what the queue is holding it to.
    //
    // Progress is reported per id by the provider because pr-downloader rewrites the name it reports
    // partway through a download, so the transport's own idea of what it is fetching cannot be matched
    // back to what was asked for.
    acquire(ids: string[], report: ContentReporter): Promise<void>;
    remove(ids: string[]): Promise<void>;
}
