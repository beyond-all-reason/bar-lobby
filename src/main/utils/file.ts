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

export async function get(key: string, cachePath: string): Promise<any | null> {
    if (await fileExists(cachePath)) {
        const data = await fs.promises.readFile(cachePath, "utf-8");
        const cache = JSON.parse(data);
        return key in cache ? cache[key] : null;
    }
    return null;
}

export async function set(key: string, value: any, cachePath: string): Promise<void> {
    let cache: { [key: string]: any } = {};
    if (await fileExists(cachePath)) {
        const data = await fs.promises.readFile(cachePath, "utf-8");
        cache = JSON.parse(data);
    }

    cache[key] = value;
    await fs.promises.writeFile(cachePath, JSON.stringify(cache), "utf-8");
}
