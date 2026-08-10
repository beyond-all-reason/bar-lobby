// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT
// @renderer/composables/useLocaleOptions.ts
import { computed } from "vue";
import { settingsStore } from "@renderer/store/settings.store";
import type { Locale } from "@renderer/locales";
import { useTypedI18n } from "@renderer/i18n";

export interface LocaleOption {
    label: string;
    value: Locale;
}

export function useLocaleOptions() {
    const { availableLocales } = useTypedI18n();
    const localeOptions = computed<LocaleOption[]>(() => {
        return (availableLocales as Locale[])
            .filter((code) => {
                if (code === "dev") {
                    return settingsStore.devMode;
                }
                return true;
            })
            .map((code) => {
                let label: string = code;

                if (code === "dev") {
                    return { label: "Dev (Scrambled)", value: code };
                }

                try {
                    const formatter = new Intl.DisplayNames([code], { type: "language" });
                    const nativeName = formatter.of(code);

                    if (nativeName) {
                        label = nativeName.charAt(0).toUpperCase() + nativeName.slice(1);
                    }
                } catch (e) {
                    console.warn(`Failed to get native name for locale code: ${code}`, e);
                    label = code.toUpperCase();
                }

                return {
                    label,
                    value: code,
                };
            });
    });

    return {
        localeOptions,
    };
}
