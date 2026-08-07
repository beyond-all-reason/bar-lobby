// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentRef } from "@main/content/content-ref";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { files } = vi.hoisted(() => ({ files: new Map<string, string>() }));

vi.mock("@main/config/app", () => ({ getAssetsPath: () => "/assets" }));
vi.mock("@main/utils/logger", () => ({
    logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock("fs", () => ({
    default: {
        existsSync: (file: string) => files.has(file),
        promises: {
            mkdir: vi.fn().mockResolvedValue(undefined),
            readFile: async (file: string) => {
                const contents = files.get(file);
                if (contents === undefined) {
                    throw new Error(`ENOENT ${file}`);
                }

                return contents;
            },
            writeFile: async (file: string, contents: string) => void files.set(file, contents),
        },
    },
}));

import { contentUsage } from "@main/content/content-usage";

const map = (id: string): ContentRef => ({ type: "map", id });

// The store builds its path with path.join, so the separator depends on the platform.
function written() {
    return JSON.parse([...files.values()][0]);
}

describe("contentUsage", () => {
    beforeEach(async () => {
        files.clear();
        await contentUsage.init();
    });

    it("reports nothing for content it has never seen", () => {
        expect(contentUsage.lastUsed(map("Quicksilver"))).toBeUndefined();
    });

    it("records when content was used", async () => {
        const at = new Date("2026-01-02T03:04:05.000Z");

        await contentUsage.markUsed([map("Quicksilver")], at);

        expect(contentUsage.lastUsed(map("Quicksilver"))?.toISOString()).toBe(at.toISOString());
    });

    it("replaces an earlier timestamp rather than accumulating entries", async () => {
        await contentUsage.markUsed([map("Quicksilver")], new Date("2026-01-01T00:00:00.000Z"));
        await contentUsage.markUsed([map("Quicksilver")], new Date("2026-06-01T00:00:00.000Z"));

        expect(contentUsage.lastUsed(map("Quicksilver"))?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
        expect(written().usage).toHaveLength(1);
    });

    it("keeps ids that contain a colon distinct from the type prefix", async () => {
        await contentUsage.markUsed([{ type: "game", id: "byar:test" }]);

        expect(contentUsage.lastUsed({ type: "game", id: "byar:test" })).toBeDefined();
        expect(contentUsage.lastUsed({ type: "game", id: "test" })).toBeUndefined();
    });

    it("survives a reload from disk", async () => {
        await contentUsage.markUsed([map("Quicksilver")], new Date("2026-03-03T00:00:00.000Z"));

        await contentUsage.init();

        expect(contentUsage.lastUsed(map("Quicksilver"))?.toISOString()).toBe("2026-03-03T00:00:00.000Z");
    });

    it("forgets content that is no longer installed", async () => {
        await contentUsage.markUsed([map("Quicksilver"), map("Gone")]);

        await contentUsage.forgetAllExcept([map("Quicksilver")]);

        expect(contentUsage.lastUsed(map("Gone"))).toBeUndefined();
        expect(contentUsage.lastUsed(map("Quicksilver"))).toBeDefined();
    });

    it("ignores an unreadable timestamp instead of treating it as a date", async () => {
        await contentUsage.markUsed([map("Quicksilver")]);
        const corrupted = [...files.keys()][0];
        files.set(corrupted, JSON.stringify({ usage: [{ type: "map", id: "Quicksilver", lastUsed: "not a date" }] }));
        await contentUsage.init();

        expect(contentUsage.lastUsed(map("Quicksilver"))).toBeUndefined();
    });
});
