// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { createTranslator, FALLBACK_LANGUAGE, languageCandidates, parseTranslations } from "@main/content/game/campaign-i18n";

describe("createTranslator", () => {
    it("returns the first table that has the key", () => {
        const translate = createTranslator({ a: "mission" }, { a: "campaign", b: "campaign only" });

        expect(translate("a")).toBe("mission");
        expect(translate("b")).toBe("campaign only");
    });

    it("returns the key itself when nothing resolves it", () => {
        expect(createTranslator({})("missing.key")).toBe("missing.key");
        expect(createTranslator()("missing.key")).toBe("missing.key");
    });

    it("skips tables that are absent", () => {
        const translate = createTranslator(undefined, { a: "campaign" }, undefined);

        expect(translate("a")).toBe("campaign");
    });

    it("does not resolve inherited object properties", () => {
        // A key like 'constructor' must not pick up Object.prototype.
        expect(createTranslator({})("constructor")).toBe("constructor");
        expect(createTranslator({})("toString")).toBe("toString");
    });
});

describe("parseTranslations", () => {
    it("keeps string values and drops everything else", () => {
        const parsed = parseTranslations(Buffer.from(JSON.stringify({ a: "text", b: 1, c: null, d: { nested: "x" }, e: ["x"] })));

        expect(parsed).toEqual({ a: "text" });
    });

    it("rejects a document that is not an object", () => {
        expect(() => parseTranslations(Buffer.from('["a"]'))).toThrow();
        expect(() => parseTranslations(Buffer.from("null"))).toThrow();
        expect(() => parseTranslations(Buffer.from('"text"'))).toThrow();
    });

    it("propagates malformed JSON", () => {
        expect(() => parseTranslations(Buffer.from("{"))).toThrow();
    });
});

describe("languageCandidates", () => {
    it("tries the requested language before the fallback", () => {
        expect(languageCandidates("de")).toEqual(["de", FALLBACK_LANGUAGE]);
    });

    it("falls back from a regional tag to its base language", () => {
        expect(languageCandidates("pt-BR")).toEqual(["pt-br", "pt", FALLBACK_LANGUAGE]);
        expect(languageCandidates("zh_CN")).toEqual(["zh_cn", "zh", FALLBACK_LANGUAGE]);
    });

    it("does not repeat the fallback when it is the requested language", () => {
        expect(languageCandidates("en")).toEqual(["en"]);
        expect(languageCandidates("EN")).toEqual(["en"]);
    });

    it("uses only the fallback when no language is set", () => {
        expect(languageCandidates(null)).toEqual([FALLBACK_LANGUAGE]);
        expect(languageCandidates(undefined)).toEqual([FALLBACK_LANGUAGE]);
        expect(languageCandidates("  ")).toEqual([FALLBACK_LANGUAGE]);
    });
});
