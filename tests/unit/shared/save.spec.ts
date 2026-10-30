// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { chosenDifficulty, saveCompatibility } from "@shared/content/save";
import type { ItemDifficulties } from "@shared/content/singleplayer";

describe("chosenDifficulty", () => {
    const item: ItemDifficulties = { difficulties: ["easy", "medium", "hard"], defaultDifficulty: "medium" };

    it("gives the saved difficulty", () => {
        expect(chosenDifficulty({ difficulty: "hard" }, item)).toBe("hard");
    });

    it("gives the default without a save or a choice", () => {
        expect(chosenDifficulty(undefined, item)).toBe("medium");
        expect(chosenDifficulty({}, item)).toBe("medium");
    });

    // Content can stop offering one after it was chosen, and a newer client may know ones this one doesn't.
    it("gives the default for a saved difficulty the item no longer offers", () => {
        expect(chosenDifficulty({ difficulty: "story" }, item)).toBe("medium");
        expect(chosenDifficulty({ difficulty: "nightmare" }, item)).toBe("medium");
    });
});

describe("saveCompatibility", () => {
    it("takes a missing version on either side as 1", () => {
        expect(saveCompatibility({})).toBe("compatible");
        expect(saveCompatibility({ saveVersion: 1 })).toBe("compatible");
        expect(saveCompatibility({}, 1)).toBe("compatible");
    });

    it("needs the save started under the content's version", () => {
        expect(saveCompatibility({ saveVersion: 2 }, 2)).toBe("compatible");
        expect(saveCompatibility({}, 2)).toBe("older");
        expect(saveCompatibility({ saveVersion: 3 }, 2)).toBe("newer");
    });
});
