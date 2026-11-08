// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { isCompatible, matchingPairs } from "@shared/content/compatibility";
import type { Compatibility } from "@shared/content/schema/common";

// Engine A works with games 1 to 3, engine B with games 2 to 4.
const accepted: Compatibility = [
    { engineVersion: "A", gameVersions: ["1", "2", "3"] },
    { engineVersion: "B", gameVersions: ["2", "3", "4"] },
];

describe("matchingPairs", () => {
    it("matches an engine with one of its own games", () => {
        expect(matchingPairs(accepted, [{ engineVersion: "B", gameVersions: ["4"] }])).toEqual([{ engineVersion: "B", gameVersion: "4" }]);
    });

    it("lists every matching pair in the content's order", () => {
        expect(
            matchingPairs(accepted, [
                { engineVersion: "B", gameVersions: ["3"] },
                { engineVersion: "A", gameVersions: ["3", "9"] },
            ])
        ).toEqual([
            { engineVersion: "A", gameVersion: "3" },
            { engineVersion: "B", gameVersion: "3" },
        ]);
    });

    // Both are accepted on their own, but game 4 only pairs with engine B.
    it("does not pair an engine with a game accepted only under another engine", () => {
        expect(isCompatible(accepted, [{ engineVersion: "A", gameVersions: ["4"] }])).toBe(false);
    });

    it("does not match when the engine is not available", () => {
        expect(isCompatible(accepted, [{ engineVersion: "C", gameVersions: ["1", "2", "3", "4"] }])).toBe(false);
    });

    it("joins available entries that repeat an engine", () => {
        expect(
            isCompatible(accepted, [
                { engineVersion: "A", gameVersions: ["9"] },
                { engineVersion: "A", gameVersions: ["1"] },
            ])
        ).toBe(true);
    });
});
