// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentType } from "@main/content/content-ref";
import { ContentReporter } from "@main/content/content-state";

export interface ContentProvider {
    readonly type: ContentType;
    init(): Promise<void>;
    reinit(): Promise<void>;
    isPresent(id: string): boolean;
    installed(): string[];
    // Batched signature because prd takes repeatable --download-* flags. The queue still passes one id
    // at a time: a batched rapid invocation parallelises inside prd, past the slot count.
    // Progress is per id from the provider - prd rewrites the name it reports mid-download.
    acquire(ids: string[], report: ContentReporter): Promise<void>;
    remove(ids: string[]): Promise<void>;
}
