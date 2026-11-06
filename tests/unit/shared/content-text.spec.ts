// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { LanguageTables, resolveContentText } from "@shared/content/content-text";

const mission: LanguageTables = {
    en: { "missions.one.title": "Mission One", "missions.one.only": "Mission English only" },
    fr: { missions: { one: { title: "Mission Un" } } },
};
const campaign: LanguageTables = {
    en: { campaign: { title: "The Campaign", "nested.dotted": "Mixed keys" }, "missions.one.title": "Campaign's own title for mission one" },
    pt: { campaign: { title: "A Campanha" } },
};

describe("resolveContentText", () => {
    it("prefers the mission's own text over the campaign's", () => {
        expect(resolveContentText("missions.one.title", "en", [mission, campaign])).toBe("Mission One");
    });

    it("falls back to the campaign's language folder", () => {
        expect(resolveContentText("campaign.title", "en", [mission, campaign])).toBe("The Campaign");
    });

    it("reads nested, flat dotted and mixed keys", () => {
        expect(resolveContentText("missions.one.title", "fr", [mission])).toBe("Mission Un");
        expect(resolveContentText("missions.one.only", "en", [mission])).toBe("Mission English only");
        expect(resolveContentText("campaign.nested.dotted", "en", [campaign])).toBe("Mixed keys");
    });

    it("tries every folder in the asked locale before falling back to English", () => {
        expect(resolveContentText("campaign.title", "pt", [mission, campaign])).toBe("A Campanha");
        expect(resolveContentText("missions.one.only", "fr", [mission, campaign])).toBe("Mission English only");
    });

    it("falls back from a regional locale to its base language", () => {
        expect(resolveContentText("campaign.title", "pt-BR", [campaign])).toBe("A Campanha");
    });

    it("shows the key when no table has it", () => {
        expect(resolveContentText("missions.two.title", "fr", [mission, campaign])).toBe("missions.two.title");
    });

    it("does not take a nested object for text", () => {
        expect(resolveContentText("missions.one", "fr", [mission])).toBe("missions.one");
    });
});
