// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it } from "vitest";
import { computed, nextTick } from "vue";
import devTranslation from "@renderer/assets/languages/dev.json";
import { i18n, resolveLocale, t } from "@renderer/i18n";
import { settingsStore } from "@renderer/store/settings.store";

const key = "lobby.navbar.settings.language";
const english = "Language";
const scrambled = devTranslation.lobby.navbar.settings.language;

async function setLanguage(language: string | null) {
    settingsStore.language = language;
    await nextTick();
}

describe("global i18n", () => {
    beforeEach(async () => {
        await setLanguage("en");
    });

    it("follows settingsStore.language", async () => {
        expect(scrambled).not.toBe(english);

        await setLanguage("dev");

        expect(i18n.global.locale.value).toBe("dev");
        expect(t(key)).toBe(scrambled);
    });

    it("updates computed translations when the locale changes", async () => {
        const label = computed(() => t(key));
        expect(label.value).toBe(english);

        await setLanguage("dev");

        expect(label.value).toBe(scrambled);
    });

    // The system locale is passed explicitly so these don't depend on the machine running them.
    describe("resolveLocale", () => {
        it("prefers a supported saved language", () => {
            expect(resolveLocale("fr", "de-DE")).toBe("fr");
        });

        it("uses the system language when nothing supported is saved", () => {
            expect(resolveLocale(null, "de-DE")).toBe("de");
            expect(resolveLocale("xx", "de-DE")).toBe("de");
        });

        it("falls back to English when the system language is unsupported too", () => {
            expect(resolveLocale("xx", "ja-JP")).toBe("en");
        });
    });

    // Untranslated entries are null in the generated files.
    it("falls back to English for untranslated entries", async () => {
        await setLanguage("de");

        expect(t(key)).toBe(english);
    });
});
