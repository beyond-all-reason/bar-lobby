// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { files, readFileSync, paths, warn } = vi.hoisted(() => {
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
    };
});

vi.mock("fs", () => ({ default: { readFileSync } }));
vi.mock("@main/config/app", () => ({ getAssetsPath: () => paths.assets }));
vi.mock("@main/config/edition", async () => {
    const { editionFeatures } = await vi.importActual<typeof import("@shared/edition")>("@shared/edition");

    return { EDITION_FEATURES: editionFeatures("steam") };
});
vi.mock("@main/utils/logger", () => ({ logger: () => ({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() }) }));

const manifest = (assets: string) => path.join(assets, "bundled-content.json");

describe("getBundledContent", () => {
    beforeEach(() => {
        vi.resetModules();
        files.clear();
        readFileSync.mockClear();
        warn.mockClear();
        paths.assets = "/install/assets";
    });

    async function load() {
        return (await import("@main/config/bundled-content")).getBundledContent;
    }

    it("reads the manifest from the assets directory", async () => {
        files.set(manifest("/install/assets"), JSON.stringify({ engines: ["2026.07.04"], games: ["Beyond All Reason test-1-abc"] }));
        const getBundledContent = await load();

        expect(getBundledContent()).toEqual({ engines: ["2026.07.04"], games: ["Beyond All Reason test-1-abc"] });
        expect(warn).not.toHaveBeenCalled();
    });

    it("lists nothing and warns when an install that cannot download engines has no manifest", async () => {
        const getBundledContent = await load();

        expect(getBundledContent()).toEqual({ engines: [], games: [] });
        expect(warn).toHaveBeenCalledOnce();
    });

    it("reads the file once for the same assets directory", async () => {
        files.set(manifest("/install/assets"), JSON.stringify({ engines: ["2026.07.04"], games: [] }));
        const getBundledContent = await load();

        getBundledContent();
        getBundledContent();

        expect(readFileSync).toHaveBeenCalledOnce();
    });

    it("reads it again once the assets directory moves", async () => {
        files.set(manifest("/elsewhere"), JSON.stringify({ engines: ["2026.10.1"], games: [] }));
        const getBundledContent = await load();
        getBundledContent();

        paths.assets = "/elsewhere";

        expect(getBundledContent().engines).toEqual(["2026.10.1"]);
    });
});
