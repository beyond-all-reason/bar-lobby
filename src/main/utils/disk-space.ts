// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "fs";

// bavail rather than bfree: the reserved blocks bfree counts are not ours to write into.
export async function freeBytes(directory: string) {
    const stats = await fs.promises.statfs(directory);

    return stats.bavail * stats.bsize;
}

export function formatBytes(bytes: number) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }

    return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}
