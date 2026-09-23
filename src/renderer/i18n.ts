// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { createI18n, useI18n, type NamedValue, type TranslateOptions } from "vue-i18n";
import { watch } from "vue";
import enTranslation from "@renderer/assets/languages/en.json";
import csTranslation from "@renderer/assets/languages/cs.json";
import deTranslation from "@renderer/assets/languages/de.json";
import frTranslation from "@renderer/assets/languages/fr.json";
import ruTranslation from "@renderer/assets/languages/ru.json";
import zhTranslation from "@renderer/assets/languages/zh.json";
import devTranslation from "@renderer/assets/languages/dev.json";
import { settingsStore } from "@renderer/store/settings.store";
import { isLocale, type Locale } from "@renderer/locales";

type MessageSchema = typeof enTranslation;

// Leaf paths only, so a namespace like "lobby.api" is not accepted as a key.
type LeafPaths<T> = {
    [K in keyof T & string]: T[K] extends Record<string, unknown> ? `${K}.${LeafPaths<T[K]>}` : K;
}[keyof T & string];

/** Every translation key defined in the English messages. */
export type TranslationKey = LeafPaths<MessageSchema>;

/** vue-i18n's `t`, narrowed so only known keys compile. */
export interface TypedTranslate {
    (key: TranslationKey): string;
    (key: TranslationKey, named: NamedValue): string;
    (key: TranslationKey, plural: number): string;
    (key: TranslationKey, plural: number, options: TranslateOptions): string;
    (key: TranslationKey, named: NamedValue, plural: number): string;
    (key: TranslationKey, named: NamedValue, options: TranslateOptions): string;
}

// Other locales have missing or null (untranslated) entries, so they can't satisfy the English schema.
// vue-i18n falls back to English for those at runtime; keys are only ever checked against English.
const messages: Record<Locale, MessageSchema> = {
    en: enTranslation,
    cs: csTranslation as unknown as MessageSchema,
    de: deTranslation as unknown as MessageSchema,
    fr: frTranslation as unknown as MessageSchema,
    ru: ruTranslation as unknown as MessageSchema,
    zh: zhTranslation as unknown as MessageSchema,
    dev: devTranslation as unknown as MessageSchema,
};

/** The single i18n instance for the renderer. Its locale follows `settingsStore.language`. */
export const i18n = createI18n<[MessageSchema], Locale, false>({
    locale: "en",
    fallbackLocale: "en",
    messages,
    legacy: false,
});

function resolveLocale(language: string | null | undefined): Locale {
    if (isLocale(language)) return language;
    const systemLanguage = Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0];
    return isLocale(systemLanguage) ? systemLanguage : "en";
}

// Also covers the initial load, since initSettingsStore assigns the saved language after this module runs.
watch(
    () => settingsStore.language,
    (language) => {
        i18n.global.locale.value = resolveLocale(language);
    },
    { immediate: true }
);

/**
 * Translate outside of components (stores, APIs, composables).
 * Reactive when called inside a computed, watcher or render; otherwise returns the current locale's string.
 */
export const t: TypedTranslate = (key: TranslationKey, ...args: unknown[]) => (i18n.global.t as (key: string, ...args: unknown[]) => string)(key, ...args);

/** The global composer for use in components, with `t` narrowed to known keys. */
export function useTypedI18n() {
    const composer = useI18n<[MessageSchema], Locale>({ useScope: "global" });
    return composer as Omit<typeof composer, "t"> & { t: TypedTranslate };
}
