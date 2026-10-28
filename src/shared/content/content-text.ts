// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { LanguageTable } from "./schema/language-file";

// Language tables keyed by locale, such as `en`, as read from one language/ folder.
export type LanguageTables = Record<string, LanguageTable>;

export const FALLBACK_LOCALE = "en";

// Nested keys and flat dotted keys are both allowed, and mixed: `a.b.c` may be written as `{ "a": { "b.c": … } }`.
function lookup(table: LanguageTable | undefined, key: string): string | undefined {
    if (!table) {
        return undefined;
    }

    const direct = table[key];
    if (typeof direct === "string") {
        return direct;
    }

    const parts = key.split(".");
    for (let i = parts.length - 1; i > 0; i--) {
        const child = table[parts.slice(0, i).join(".")];
        if (child && typeof child === "object") {
            const found = lookup(child, parts.slice(i).join("."));
            if (found !== undefined) {
                return found;
            }
        }
    }

    return undefined;
}

// Every locale falls back to English, so a key with English text never shows as the key itself.
export function hasFallbackText(key: string, tables: readonly LanguageTables[]): boolean {
    return tables.some((folder) => lookup(folder[FALLBACK_LOCALE], key) !== undefined);
}

/**
 * Text for a content language key. `tables` runs from the most specific folder to the least, such as a
 * mission's language/ and then its campaign's shared/language/. Each is tried in the locale asked for,
 * then in its base language (`pt` for `pt-BR`), then in English, and the key itself is shown when
 * nothing has it.
 *
 * This is content text only. The lobby's own strings live in lang/ and go through vue-i18n.
 */
export function resolveContentText(key: string, locale: string, tables: readonly LanguageTables[]): string {
    const locales = [...new Set([locale, locale.split("-")[0], FALLBACK_LOCALE])];

    for (const candidate of locales) {
        for (const folder of tables) {
            const found = lookup(folder[candidate], key);
            if (found !== undefined) {
                return found;
            }
        }
    }

    return key;
}
