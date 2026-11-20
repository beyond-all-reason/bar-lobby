// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import path from "node:path";

/**
 * Writes through a temp file and renames it over the target, so a crash mid-write can't leave a truncated
 * file and a reader never sees a half-written one. The temp name adds `.tmp`, so `*.json` and `*.cfg` patterns,
 * such as a cloud sync's, don't match it.
 */
export async function writeFileAtomic(filePath: string, data: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, data);
    await fs.rename(tempPath, filePath);
}
