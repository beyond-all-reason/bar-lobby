// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseDefaultFile } from "@shared/install-defaults";

const { files, readFileSync, paths, warn, config } = vi.hoisted(() => {
    const files = new Map<string, string>();

    return {
        files,
        readFileSync: vi.fn((file: string) => {
            const content = files.get(file);
            if (content === undefined) {
                throw Object.assign(new Error(`ENOENT: ${file}`), { code: "ENOENT" });
            }

            return content;
        }),
        paths: { assets: "/install/assets" },
        warn: vi.fn(),
        config: { defaultEngineVersion: "2026.07.04" },
    };
});

vi.mock("fs", () => ({ default: { readFileSync } }));
vi.mock("@main/config/app", () => ({ getAssetsPath: () => paths.assets }));
vi.mock("@main/config/edition", async () => {
    const { editionFeatures } = await vi.importActual<typeof import("@shared/edition")>("@shared/edition");

    return { EDITION_FEATURES: editionFeatures("steam") };
});
vi.mock("@main/services/config.service", () => ({ configService: { getConfig: () => config } }));
vi.mock("@main/utils/logger", () => ({ logger: () => ({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() }) }));

const engineFile = (assets: string) => path.join(assets, "engine", "default.txt");
const gameFile = (assets: string) => path.join(assets, "games", "default.txt");

describe("parseDefaultFile", () => {
    it("takes the version without surrounding whitespace", () => {
        expect(parseDefaultFile("2026.10.1\r\n")).toBe("2026.10.1");
    });

    it("finds nothing in a missing or blank file", () => {
        expect(parseDefaultFile(undefined)).toBeUndefined();
        expect(parseDefaultFile(" \n")).toBeUndefined();
    });
});

describe("install defaults", () => {
    beforeEach(() => {
        vi.resetModules();
        files.clear();
        readFileSync.mockClear();
        warn.mockClear();
        paths.assets = "/install/assets";
    });

    const load = () => import("@main/config/install-defaults");

    it("reads the default engine and game from the assets directory", async () => {
        files.set(engineFile("/install/assets"), "2026.10.1\n");
        files.set(gameFile("/install/assets"), "Beyond All Reason test-1-abc\n");
        const { getInstallDefaults } = await load();

        expect(getInstallDefaults()).toEqual({ engine: "2026.10.1", game: "Beyond All Reason test-1-abc" });
        expect(warn).not.toHaveBeenCalled();
    });

    it("names nothing and warns for each missing file where engines and games cannot be downloaded", async () => {
        const { getInstallDefaults } = await load();

        expect(getInstallDefaults()).toEqual({ engine: undefined, game: undefined });
        expect(warn).toHaveBeenCalledTimes(2);
    });

    it("reads the files once for the same assets directory", async () => {
        files.set(engineFile("/install/assets"), "2026.10.1");
        const { getInstallDefaults } = await load();

        getInstallDefaults();
        getInstallDefaults();

        expect(readFileSync).toHaveBeenCalledTimes(2);
    });

    it("reads them again once the assets directory moves", async () => {
        files.set(engineFile("/elsewhere"), "2026.10.1");
        const { getInstallDefaults } = await load();
        getInstallDefaults();

        paths.assets = "/elsewhere";

        expect(getInstallDefaults().engine).toBe("2026.10.1");
    });

    it("makes the install's engine the default engine, ahead of the remote config's", async () => {
        const { getDefaultEngineVersion } = await load();
        expect(getDefaultEngineVersion()).toBe("2026.07.04");

        vi.resetModules();
        files.set(engineFile("/install/assets"), "2026.10.1");
        expect((await load()).getDefaultEngineVersion()).toBe("2026.10.1");
    });
});
