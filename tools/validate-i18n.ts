// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type TranslationValue = string | number | boolean | null | TranslationObject | TranslationValue[];
interface TranslationObject {
    [key: string]: TranslationValue;
}

const OUTPUT_DIR = path.resolve(__dirname, "../src/renderer/assets/languages");
const REFERENCE_LOCALE = "en";

function countKeys(obj: TranslationObject, prefix = ""): { total: number; nulls: number; paths: string[] } {
    let total = 0;
    let nulls = 0;
    const paths: string[] = [];

    for (const key in obj) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            const nested = countKeys(value as TranslationObject, currentPath);
            total += nested.total;
            nulls += nested.nulls;
            paths.push(...nested.paths);
        } else {
            total++;
            if (value === null) {
                nulls++;
                paths.push(currentPath);
            }
        }
    }

    return { total, nulls, paths };
}

async function main() {
    const files = await fs.promises.readdir(OUTPUT_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    if (jsonFiles.length === 0) {
        console.error("No generated translation files found. Run `npm run generate-i18n-assets` first.");
        process.exit(1);
    }

    let hasErrors = false;
    const results: { locale: string; total: number; translated: number; coverage: string }[] = [];

    for (const file of jsonFiles) {
        const locale = file.replace(".json", "");
        const content = await fs.promises.readFile(path.join(OUTPUT_DIR, file), "utf-8");

        let parsed: TranslationObject;
        try {
            parsed = JSON.parse(content);
        } catch {
            console.error(`\x1b[31m✗ ${locale}: Invalid JSON\x1b[0m`);
            hasErrors = true;
            continue;
        }

        const { total, nulls, paths } = countKeys(parsed);
        const translated = total - nulls;
        const coverage = total > 0 ? ((translated / total) * 100).toFixed(1) : "0.0";

        results.push({ locale, total, translated, coverage });

        if (locale === REFERENCE_LOCALE && nulls > 0) {
            console.error(`\x1b[31m✗ ${locale} (reference): ${nulls} null value(s) found — source locale must be complete\x1b[0m`);
            for (const p of paths) {
                console.error(`    - ${p}`);
            }
            hasErrors = true;
        }
    }

    console.log("\nTranslation coverage report:");
    console.log("─".repeat(45));
    for (const r of results.sort((a, b) => a.locale.localeCompare(b.locale))) {
        const bar = r.locale === REFERENCE_LOCALE ? "(reference)" : `${r.translated}/${r.total}`;
        const color = r.coverage === "100.0" ? "\x1b[32m" : r.locale === REFERENCE_LOCALE ? "\x1b[36m" : "\x1b[33m";
        console.log(`${color}  ${r.locale.padEnd(6)} ${r.coverage.padStart(6)}%  ${bar}\x1b[0m`);
    }
    console.log("");

    if (hasErrors) {
        console.error("Validation failed.");
        process.exit(1);
    }

    console.log("\x1b[32mValidation passed.\x1b[0m");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
