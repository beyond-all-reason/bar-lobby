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

type Locale = "cs" | "de" | "en" | "fr" | "ru" | "zh";
type MessageSchema = typeof enTranslation;

const messages = {
    en: enTranslation,
    cs: csTranslation as any,
    de: deTranslation as any,
    fr: frTranslation as any,
    ru: ruTranslation as any,
    zh: zhTranslation as any,
};

export function setupI18n() {
    const myLocale = Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0]; // TODO: add override from user settings

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
