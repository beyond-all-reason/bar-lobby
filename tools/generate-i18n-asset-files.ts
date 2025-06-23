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

const LANG_DIR = path.resolve(__dirname, "../lang");
const OUTPUT_DIR = path.resolve(__dirname, "../src/renderer/assets/languages");
const REFERENCE_LOCALE = "en";

async function getLocalesFromLangDirectories() {
    try {
        const entries = await fs.promises.readdir(LANG_DIR, { withFileTypes: true });
        return entries.filter((entry) => entry.isDirectory()).map((dir) => dir.name);
    } catch (error) {
        console.error("Error reading language directories:", error);
        return [];
    }
}

async function getLanguageFiles(locale: string) {
    return new Promise<Array<string>>((resolve, reject) => {
        fs.glob(path.join(LANG_DIR, locale, "**/*.json"), (err, matches) => {
            if (err) reject(err);
            else resolve(matches);
        });
    });
}

async function getObjectFromLanguageFile(path: string) {
    return new Promise<TranslationObject>((resolve, reject) => {
        fs.readFile(path, "utf-8", (err, data) => {
            if (err) reject(err);
            resolve(JSON.parse(data));
        });
    });
}

async function processLocale(locale: string): Promise<TranslationObject> {
    const languageFiles = await getLanguageFiles(locale);
    let localeObject: TranslationObject = {};

    for (const languageFile of languageFiles) {
        const languageObject = await getObjectFromLanguageFile(languageFile);
        localeObject = { ...localeObject, ...languageObject };
    }

    return localeObject;
}

function addMissingKeys(referenceObject: TranslationObject, targetObject: TranslationObject, path = ""): TranslationObject {
    const result = { ...targetObject };

    // Process all keys in the reference object
    for (const key in referenceObject) {
        const currentPath = path ? `${path}.${key}` : key;

        // If reference value is an object (not array), recurse
        if (referenceObject[key] !== null && typeof referenceObject[key] === "object" && !Array.isArray(referenceObject[key])) {
            // Initialize if doesn't exist in target
            if (!result[key] || typeof result[key] !== "object" || Array.isArray(result[key])) {
                result[key] = {};
            }
            // Recursively process nested object
            result[key] = addMissingKeys(referenceObject[key], result[key], currentPath);
        }
        // Handle leaf values (strings, numbers, etc.)
        else if (!(key in result)) {
            // Key doesn't exist in target, set to null
            result[key] = null;
        }
    }

    return result;
}

async function main() {
    const locales = await getLocalesFromLangDirectories();

    if (!locales.includes(REFERENCE_LOCALE)) {
        console.error(`Reference locale '${REFERENCE_LOCALE}' not found. Cannot proceed.`);
        return;
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log(`Processing reference locale: ${REFERENCE_LOCALE}`);
    const referenceObject = await processLocale(REFERENCE_LOCALE);

    const referenceOutputPath = path.join(OUTPUT_DIR, `${REFERENCE_LOCALE}.json`);
    fs.writeFileSync(referenceOutputPath, JSON.stringify(referenceObject, null, 2));
    console.log("\x1b[2;32mTranslation asset file written to:\x1b[0m\x1b[36m", referenceOutputPath);

    for (const locale of locales) {
        if (locale === REFERENCE_LOCALE) continue;

        console.log(`Processing locale: ${locale}`);
        const localeObject = await processLocale(locale);

        const completeLocaleObject = addMissingKeys(referenceObject, localeObject);

        const outputFilePath = path.join(OUTPUT_DIR, `${locale}.json`);
        fs.writeFileSync(outputFilePath, JSON.stringify(completeLocaleObject, null, 2));
        console.log("\x1b[2;32mTranslation asset file written to:\x1b[0m\x1b[36m", outputFilePath);
    }
}

main().catch(console.error);
