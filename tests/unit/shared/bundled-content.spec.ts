// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { bundledDefault, parseBundledContent } from "@shared/bundled-content";

describe("parseBundledContent", () => {
    it("reads the engines and games", () => {
        expect(parseBundledContent(JSON.stringify({ engines: ["2026.07.04"], games: ["Beyond All Reason test-1-abc"] }))).toEqual({
            engines: ["2026.07.04"],
            games: ["Beyond All Reason test-1-abc"],
        });
    });

    it("lists nothing when there is no file", () => {
        expect(parseBundledContent(undefined)).toEqual({ engines: [], games: [] });
    });

    it("lists nothing when the file cannot be parsed", () => {
        expect(parseBundledContent("{ not json")).toEqual({ engines: [], games: [] });
        expect(parseBundledContent("null")).toEqual({ engines: [], games: [] });
    });

    it("keeps only names", () => {
        expect(parseBundledContent(JSON.stringify({ engines: "2026.07.04", games: ["Beyond All Reason test-1-abc", 3, "", null] }))).toEqual({
            engines: [],
            games: ["Beyond All Reason test-1-abc"],
        });
    });
});

describe("bundledDefault", () => {
    it("is the one engine or game bundled", () => {
        const content = { engines: ["2026.07.04"], games: ["Beyond All Reason test-1-abc"] };

        expect(bundledDefault(content, "engine")).toBe("2026.07.04");
        expect(bundledDefault(content, "game")).toBe("Beyond All Reason test-1-abc");
    });

    it("is nothing when there is a choice to make or nothing listed", () => {
        expect(bundledDefault({ engines: ["2026.07.04", "2026.10.1"], games: [] }, "engine")).toBeUndefined();
        expect(bundledDefault({ engines: [], games: [] }, "game")).toBeUndefined();
        expect(bundledDefault(undefined, "engine")).toBeUndefined();
    });
});
