// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { saveCompatibility } from "@shared/content/save";

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
