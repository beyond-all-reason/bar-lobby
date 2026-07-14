// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "fs";

/**
 * Removes a pool whose contents failed package validation and recreates it for
 * a clean archive extraction. The archive itself lives beside the pool and is
 * intentionally retained so DownloaderHelper can resume or reuse it.
 */
export async function resetPool(poolPath: string): Promise<void> {
    await fs.promises.rm(poolPath, { recursive: true, force: true });
    await fs.promises.mkdir(poolPath, { recursive: true });
}
