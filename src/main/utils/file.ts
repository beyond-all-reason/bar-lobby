// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "fs";

export async function isFileInUse(filePath: string): Promise<boolean> {
    try {
        const file = await fs.promises.open(filePath, fs.constants.O_RDONLY | 0x10000000);
        await file.close();
        return false;
    } catch {
        return true;
    }
}

export async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}
