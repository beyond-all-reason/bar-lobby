// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs, { glob } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LANG_DIR = path.resolve(__dirname, "../lang");
const OUTPUT_DIR = path.resolve(__dirname, "../src/renderer/assets/languages");

// Function to get all directories in the LANG_DIR
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
        glob(path.join(LANG_DIR, locale, "**/*.json"), (err, matches) => {
            if (err) reject(err);
            else resolve(matches);
        });
    });
}

async function getObjectFromLanguageFile(path: string) {
    return new Promise<object>((resolve, reject) => {
        fs.readFile(path, "utf-8", (err, data) => {
            if (err) reject(err);
            resolve(JSON.parse(data));
        });
    });
}

// Example usage
async function main() {
    const locales = await getLocalesFromLangDirectories();

    let outputObject = {};

    for (const locale of locales) {
        const languageFiles = await getLanguageFiles(locale);

        for (const languageFile of languageFiles) {
            const languageObject = await getObjectFromLanguageFile(languageFile);
            outputObject = { ...outputObject, ...languageObject };
        }

        const outputFilePath = path.join(OUTPUT_DIR, `${locale}.json`);
        fs.writeFileSync(outputFilePath, JSON.stringify(outputObject, null, 2));
        console.log("\x1b[2;32mTranslation asset file written to:\x1b[0m\x1b[36m", outputFilePath);
    }
}

main().catch(console.error);
