// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import { resetPool } from "@main/content/game/pool-state";

const temporaryDirectories: string[] = [];

async function createTempDirectory() {
    const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "bar-lobby-pool-state-"));
    temporaryDirectories.push(directory);
    return directory;
}

afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.promises.rm(directory, { recursive: true, force: true })));
});

describe("resetPool", () => {
    it("removes all partial pool objects and recreates an empty pool directory", async () => {
        const assetsPath = await createTempDirectory();
        const poolPath = path.join(assetsPath, "pool");
        await fs.promises.mkdir(path.join(poolPath, "ab"), { recursive: true });
        await fs.promises.writeFile(path.join(poolPath, "ab", "partial-object.gz"), "partial pool object");

        await resetPool(poolPath);

        await expect(fs.promises.readdir(poolPath)).resolves.toEqual([]);
    });

    it("keeps the downloaded archive beside the pool so the downloader can reuse it", async () => {
        const assetsPath = await createTempDirectory();
        const poolPath = path.join(assetsPath, "pool");
        const archivePath = path.join(assetsPath, "data.7z");
        await fs.promises.mkdir(poolPath);
        await fs.promises.writeFile(archivePath, "downloaded archive");

        await resetPool(poolPath);

        await expect(fs.promises.readFile(archivePath, "utf8")).resolves.toBe("downloaded archive");
    });
});
