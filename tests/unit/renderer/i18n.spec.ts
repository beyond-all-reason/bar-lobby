// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it } from "vitest";
import { computed, nextTick } from "vue";
import devTranslation from "@renderer/assets/languages/dev.json";
import { i18n, t } from "@renderer/i18n";
import { settingsStore } from "@renderer/store/settings.store";

const key = "lobby.navbar.settings.language";
const english = "Language";
const scrambled = devTranslation.lobby.navbar.settings.language;

async function setLanguage(language: string | null) {
    settingsStore.language = language;
    await nextTick();
}

describe("global i18n", () => {
    afterEach(async () => {
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

    it("resolves an unknown language to a supported locale", async () => {
        await setLanguage("xx");

        expect(i18n.global.locale.value).toBe("en");
    });

    // Untranslated entries are null in the generated files.
    it("falls back to English for untranslated entries", async () => {
        await setLanguage("de");

        expect(t(key)).toBe(english);
    });
});
