// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createI18n, useI18n } from "vue-i18n";
import enTranslation from "@renderer/assets/languages/en.json";
import csTranslation from "@renderer/assets/languages/cs.json";
import deTranslation from "@renderer/assets/languages/de.json";
import frTranslation from "@renderer/assets/languages/fr.json";
import ruTranslation from "@renderer/assets/languages/ru.json";
import zhTranslation from "@renderer/assets/languages/zh.json";
import devTranslation from "@renderer/assets/languages/dev.json";
import { settingsStore } from "@renderer/store/settings.store";
import type { Locale } from "@renderer/locales";

type MessageSchema = typeof enTranslation;

const messages = {
    en: enTranslation,
    cs: csTranslation as any,
    de: deTranslation as any,
    fr: frTranslation as any,
    ru: ruTranslation as any,
    zh: zhTranslation as any,
    dev: devTranslation as any,
};

// TODO: this appears to be too early, because settingStore.language is undefined when opening the application.
// Instead, we need to get to the mounted stage of the application before setting the language.
export function setupI18n() {
    let myLocale = Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0];
    console.log(`Detected locale: ${myLocale}, using language from settings: ${settingsStore.language}`);
    if (!settingsStore.language) {
        settingsStore.language = myLocale as Locale;
    } else {
        myLocale = settingsStore.language;
    }

    return createI18n<[MessageSchema], Locale>({
        locale: myLocale,
        fallbackLocale: "en",
        messages,
        legacy: false,
    });
}

export function useTypedI18n() {
    return useI18n<[MessageSchema], Locale>({
        useScope: "global",
    });
}

// Reference for changing scope https://vue-i18n.intlify.dev/guide/essentials/scope.html
