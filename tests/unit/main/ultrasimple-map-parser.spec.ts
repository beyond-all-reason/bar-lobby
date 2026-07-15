// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadSpecificFile } = vi.hoisted(() => ({
    mockReadSpecificFile: vi.fn(),
}));

vi.mock("@main/utils/extract-7z", () => ({
    readSpecificFile: mockReadSpecificFile,
}));

import { UltraSimpleMapParser } from "$/map-parser/ultrasimple-map-parser";

function mapinfoLua(fields: Record<string, string>): string {
    const body = Object.entries(fields)
        .map(([key, value]) => `    ${key} = "${value}",`)
        .join("\n");
    return `local mapinfo = {\n${body}\n}\nreturn mapinfo\n`;
}

describe("UltraSimpleMapParser", () => {
    let parser: UltraSimpleMapParser;

    beforeEach(() => {
        parser = new UltraSimpleMapParser();
        mockReadSpecificFile.mockReset();
    });

    it("rejects non-.sd7 files", async () => {
        await expect(parser.parseMap("/maps/some_map.sdz")).rejects.toThrow(/extension is not supported/);
        expect(mockReadSpecificFile).not.toHaveBeenCalled();
    });

    it("uses name as-is when version is already part of the name", async () => {
        mockReadSpecificFile.mockResolvedValue(mapinfoLua({ name: "Comet Catcher Remake 1.9", version: "1.9" }));

        const result = await parser.parseMap("/maps/comet_catcher_remake_1_9.sd7");

        expect(result.springName).toBe("Comet Catcher Remake 1.9");
    });

    it("appends the version when it isn't already part of the name", async () => {
        mockReadSpecificFile.mockResolvedValue(mapinfoLua({ name: "Some Map", version: "1.2" }));

        const result = await parser.parseMap("/maps/some_map.sd7");

        expect(result.springName).toBe("Some Map 1.2");
    });

    // Regression test: a missing "version" field used to fall through to the
    // "append version" branch, producing "<name> undefined"/"<name> " which
    // never matched the expected spring name, so the map was re-downloaded
    // on every launch instead of being recognized as already installed.
    it("does not append a trailing space/undefined when version is missing (issue #629)", async () => {
        mockReadSpecificFile.mockResolvedValue(mapinfoLua({ name: "Paradise Lost V4" }));

        const result = await parser.parseMap("/maps/paradise_lost_v4.sd7");

        expect(result.springName).toBe("Paradise Lost V4");
        expect(result.springName.endsWith(" ")).toBe(false);
    });

    it("does not append a trailing space when version is an empty string", async () => {
        mockReadSpecificFile.mockResolvedValue(mapinfoLua({ name: "Paradise Lost V4", version: "" }));

        const result = await parser.parseMap("/maps/paradise_lost_v4.sd7");

        expect(result.springName).toBe("Paradise Lost V4");
        expect(result.springName.endsWith(" ")).toBe(false);
    });

    it("falls back to the smtFileName when no name is present", async () => {
        mockReadSpecificFile.mockResolvedValue(mapinfoLua({ smtFileName: "some_map.smt" }));

        const result = await parser.parseMap("/maps/some_map.sd7");

        expect(result.springName).toBe("some_map.smt");
    });

    it("falls back to the file name when neither name nor smtFileName is present", async () => {
        mockReadSpecificFile.mockResolvedValue(mapinfoLua({ description: "no name or smtFileName here" }));

        const result = await parser.parseMap("/maps/mystery_map.sd7");

        expect(result.springName).toBe("mystery_map");
        expect(result.fileName).toBe("mystery_map");
        expect(result.fileNameWithExt).toBe("mystery_map.sd7");
    });
});
