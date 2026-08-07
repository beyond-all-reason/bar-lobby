// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import zlib from "zlib";
import { promisify } from "util";

const { readFile, calcChecksum, defaultEngine } = vi.hoisted(() => ({
    readFile: vi.fn(),
    calcChecksum: vi.fn(),
    defaultEngine: { current: undefined as { id: string; installed: boolean } | undefined },
}));

vi.mock("fs", () => ({ promises: { readFile }, default: { promises: { readFile } } }));
vi.mock("@main/config/app", () => ({
    getRapidIndexPath: () => "/rapid",
    getPackagePath: () => "/packages",
    getPoolPath: () => "/pool",
    getGamePaths: () => ["/games"],
}));
vi.mock("@main/config/content-sources", () => ({ contentSources: { rapid: { host: "repos.host", game: "byar" } } }));
vi.mock("@main/utils/logger", () => ({ logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }));
vi.mock("@main/utils/checksums", () => ({ calcChecksum }));
vi.mock("@main/content/engine/engine-provider", () => ({
    engineProvider: { onDownloadComplete: { add: vi.fn() }, getDefaultEngine: () => defaultEngine.current },
}));

import { GameProvider } from "@main/content/game/game-provider";
import { GameVersion } from "@main/content/game/game-version";

const TAG = "byar:test";
const BUILD = "Beyond All Reason test-30903-2990072";
const MD5 = "e2a9f1c4a0";
const OTHER_TAG = "byar:stable";
const OTHER_BUILD = "Beyond All Reason test-30111-1111111";
const OTHER_MD5 = "bb77aa0011";

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

// A matchmaking playlist lists every asset version it requires, games included, and the client is meant
// to have all of them. One pr-downloader invocation covers the set and can only name one asset in it.
describe("batched game downloads", () => {
    function transport(gameProvider: GameProvider, lands: string[]) {
        const invocations: string[][] = [];

        Object.assign(gameProvider, {
            downloadContent: async (_type: string, names: string[]) => {
                invocations.push(names);

                return { type: "game", id: names.join(", "), name: names.join(", "), currentBytes: 0, totalBytes: 0, progress: 0 };
            },
            // Stands in for the rescan of the packages directory that follows a download.
            scanPackagesDir: async () => lands.forEach((gameVersion) => gameProvider.availableVersions.set(gameVersion, { gameVersion } as GameVersion)),
        });

        return invocations;
    }

    beforeEach(() => {
        readFile.mockReset();
        calcChecksum.mockReset();
        defaultEngine.current = { id: "2025.06.21", installed: true };
    });

    it("registers every version the one invocation covered", async () => {
        await versionsIndex(`${TAG},${MD5},,${BUILD}`, `${OTHER_TAG},${OTHER_MD5},,${OTHER_BUILD}`);
        const gameProvider = await provider([]);
        const invocations = transport(gameProvider, [BUILD, OTHER_BUILD]);

        await gameProvider.downloadGames([TAG, OTHER_TAG]);

        expect(invocations).toEqual([[TAG, OTHER_TAG]]);
        expect(gameProvider.isVersionInstalled(TAG)).toBe(true);
        expect(gameProvider.isVersionInstalled(OTHER_TAG)).toBe(true);
    });

    it("checksums each version rather than only the one the download named", async () => {
        await versionsIndex(`${TAG},${MD5},,${BUILD}`, `${OTHER_TAG},${OTHER_MD5},,${OTHER_BUILD}`);
        const gameProvider = await provider([]);
        transport(gameProvider, [BUILD, OTHER_BUILD]);

        await gameProvider.downloadGames([TAG, OTHER_TAG]);

        expect(calcChecksum.mock.calls.map((call) => call[1]).sort()).toEqual([BUILD, OTHER_BUILD].sort());
    });

    it("complains about the version that did not land, naming that one", async () => {
        await versionsIndex(`${TAG},${MD5},,${BUILD}`, `${OTHER_TAG},${OTHER_MD5},,${OTHER_BUILD}`);
        const gameProvider = await provider([]);
        transport(gameProvider, [BUILD]);

        // Naming the whole set instead would point at the version that was fine as readily as the one
        // that was not.
        await expect(gameProvider.downloadGames([TAG, OTHER_TAG])).rejects.toThrow(`No package found for game version: ${OTHER_TAG}`);
    });

    it("asks only for the versions that are not already installed", async () => {
        await versionsIndex(`${TAG},${MD5},,${BUILD}`, `${OTHER_TAG},${OTHER_MD5},,${OTHER_BUILD}`);
        const gameProvider = await provider([BUILD]);
        const invocations = transport(gameProvider, [BUILD, OTHER_BUILD]);

        await gameProvider.downloadGames([TAG, OTHER_TAG]);

        expect(invocations).toEqual([[OTHER_TAG]]);
    });
});
