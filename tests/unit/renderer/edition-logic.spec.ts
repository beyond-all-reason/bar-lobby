// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { t } from "@renderer/i18n";
import { editionLogic } from "@renderer/logic/edition";

describe("editionLogic.refusalMessageKey", () => {
    it("words a refused engine and game as missing from the Steam install", () => {
        const key = editionLogic.refusalMessageKey("content_bundled_with_install");

        expect(t(key, { content: "2099.12.1" }, 1)).toBe("2099.12.1 is missing. It comes with the Steam install: verify the integrity of the game files in Steam.");
        expect(t(key, { content: "2099.12.1, Beyond All Reason test-2-def" }, 2)).toBe(
            "2099.12.1, Beyond All Reason test-2-def are missing. They come with the Steam install: verify the integrity of the game files in Steam."
        );
    });
});
