// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import zlib from "zlib";
import { promisify } from "util";

const { readFile } = vi.hoisted(() => ({ readFile: vi.fn() }));

vi.mock("fs", () => ({ promises: { readFile }, default: { promises: { readFile } } }));
vi.mock("@main/config/app", () => ({
    getRapidIndexPath: () => "/rapid",
    getPackagePath: () => "/packages",
    getPoolPath: () => "/pool",
    getGamePaths: () => ["/games"],
}));
vi.mock("@main/config/content-sources", () => ({ contentSources: { rapid: { host: "repos.host", game: "byar" } } }));
vi.mock("@main/utils/logger", () => ({ logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }));
vi.mock("@main/utils/checksums", () => ({ calcChecksum: vi.fn() }));
vi.mock("@main/content/engine/engine-provider", () => ({ engineProvider: { onDownloadComplete: { add: vi.fn() } } }));

import { GameProvider } from "@main/content/game/game-provider";
import { GameVersion } from "@main/content/game/game-version";

const TAG = "byar:test";
const BUILD = "Beyond All Reason test-30903-2990072";
const MD5 = "e2a9f1c4a0";

// One line per rapid tag: the tag it is reachable by, the package it points at, and the build's name.
async function versionsIndex(...lines: string[]) {
    const gzipped = await promisify(zlib.gzip)(lines.join("\n"));
    readFile.mockResolvedValue(gzipped);
}

async function provider(installed: string[]) {
    const gameProvider = new GameProvider();
    await (gameProvider as unknown as { initLookupTables(): Promise<void> }).initLookupTables();
    installed.forEach((gameVersion) => gameProvider.availableVersions.set(gameVersion, { gameVersion } as GameVersion));

    return gameProvider;
}

describe("game version lookup", () => {
    beforeEach(() => {
        readFile.mockReset();
    });

    // A rolling tag is never a build name, so looking for it literally can only ever say "not installed"
    // and the acquisition that just succeeded gets reported as a failure.
    it("counts a tag as installed once the build it points at is", async () => {
        await versionsIndex(`${TAG},${MD5},,${BUILD}`);

        expect((await provider([BUILD])).isVersionInstalled(TAG)).toBe(true);
    });

    it("still answers for a build asked for by name", async () => {
        await versionsIndex(`${TAG},${MD5},,${BUILD}`);

        expect((await provider([BUILD])).isVersionInstalled(BUILD)).toBe(true);
    });

    // The whole point of a tag moving is that what it used to name is now out of date.
    it("stops counting a tag as installed once it moves to a build that is not", async () => {
        await versionsIndex(`${TAG},99cc00,,Beyond All Reason test-31000-abcdefg`);

        expect((await provider([BUILD])).isVersionInstalled(TAG)).toBe(false);
    });

    it("says nothing is installed when the index has not been fetched yet", async () => {
        readFile.mockRejectedValue(new Error("ENOENT"));

        expect((await provider([])).isVersionInstalled(TAG)).toBe(false);
    });
});
