// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export const FALLBACK_LANGUAGE = "en";

export type Translations = Record<string, string>;

export function createTranslator(...tables: (Translations | undefined)[]) {
    const present = tables.filter((table): table is Translations => table !== undefined);

    return function translate(key: string): string {
        for (const table of present) {
            const value = table[key];
            if (typeof value === "string") {
                return value;
            }
        }
        return key;
    };
}

export function parseTranslations(data: Buffer): Translations {
    const parsed: unknown = JSON.parse(data.toString("utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Expected a JSON object of key to string");
    }

    const translations: Translations = {};
    for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string") {
            translations[key] = value;
        }
    }
    return translations;
}

export function languageCandidates(language: string | null | undefined): string[] {
    const candidates: string[] = [];
    const normalized = language?.trim().toLowerCase();

    if (normalized) {
        candidates.push(normalized);
        const base = normalized.split(/[-_]/)[0];
        if (base && base !== normalized) {
            candidates.push(base);
        }
    }
    if (!candidates.includes(FALLBACK_LANGUAGE)) {
        candidates.push(FALLBACK_LANGUAGE);
    }
    return candidates;
}
