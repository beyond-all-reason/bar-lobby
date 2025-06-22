// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { createI18n, useI18n } from "vue-i18n";
import enTranslation from "@renderer/assets/languages/en.json";
import csTranslation from "@renderer/assets/languages/cs.json";
import deTranslation from "@renderer/assets/languages/de.json";
import frTranslation from "@renderer/assets/languages/fr.json";
import ruTranslation from "@renderer/assets/languages/ru.json";
import zhTranslation from "@renderer/assets/languages/zh.json";

type Locale = "cs" | "de" | "en" | "fr" | "ru" | "zh";
type MessageSchema = typeof enTranslation | typeof csTranslation | typeof deTranslation | typeof frTranslation | typeof ruTranslation | typeof zhTranslation;

const messages = {
    cs: csTranslation,
    de: deTranslation,
    en: enTranslation,
    fr: frTranslation,
    ru: ruTranslation,
    zh: zhTranslation,
};

export async function setupI18n() {
    const myLocale = Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0]; // TODO: add override from user settings

    return createI18n<[MessageSchema], Locale>({
        locale: myLocale,
        fallbackLocale: "en",
        messages,
        legacy: false,
    });
}

export function useTypedI18n(): ReturnType<typeof useI18n<{ message: MessageSchema }, Locale>> {
    return useI18n<{ message: MessageSchema }, Locale>({
        messages,
        useScope: "global",
    });
}
