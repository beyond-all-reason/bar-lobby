// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { queued } from "@main/utils/file-queue";

/**
 * Runs work with one engine version's directory held, so it can't be deleted while a process runs out of it,
 * which fails on Windows. Removal holds the checksum queue as well, and takes it first.
 */
export function holdEngineDir<T>(engineVersion: string, work: () => Promise<T>): Promise<T> {
    return queued(`engine-dir:${engineVersion}`, work);
}
