// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// This script generates a "dev" locale JSON file by scrambling the middle characters of words
// in the source English JSON file, while preserving interpolation placeholders and pluralization syntax.

import * as fs from "fs";
import * as path from "path";

// Define explicit shapes for handling nested localization JSON files
interface JsonObject {
    [key: string]: string | JsonObject | Array<string | JsonObject>;
}

type JsonValue = string | JsonObject | Array<string | JsonObject> | null | number | boolean;

// Configuration paths
const SOURCE_FILE: string = path.join(__dirname, "en.json"); // Path to your source English file
const OUTPUT_FILE: string = path.join(__dirname, "dev.json"); // Output path for JSON

/**
 * Scrambles the middle characters of a single word, leaving first/last intact.
 */
function scrambleWord(word: string): string {
    if (word.length <= 3) return word;
    const middle: string[] = word.slice(1, -1).split("");

    // Fisher-Yates Shuffle
    for (let i = middle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = middle[i];
        middle[i] = middle[j];
        middle[j] = temp;
    }

    return word[0] + middle.join("") + word[word.length - 1];
}

/**
 * Parses sentences, shielding interpolation structures and pluralization syntax.
 */
function scrambleValue(text: string): string {
    // Split by placeholders like {count}, {name}, or vue-i18n plural pipes |
    const tokenRegex = /(\{.*?\})|(\|)/g;
    const tokens: string[] = text.split(tokenRegex);

    const processedTokens: string[] = tokens.map((token: string | undefined) => {
        if (!token) return "";

        // Skip interpolation blocks and syntax boundary markers
        if ((token.startsWith("{") && token.endsWith("}")) || token === "|") {
            return token;
        }

        // Split text chunk into alphanumeric words and special characters/spaces
        const subTokens: string[] = token.split(/(\W+)/);
        return subTokens
            .map((subToken: string) => {
                if (/^[A-Za-z]+$/.test(subToken)) {
                    return scrambleWord(subToken);
                }
                return subToken;
            })
            .join("");
    });

    return processedTokens.join("");
}

/**
 * Recursively walks nested JSON structures with full type guards.
 */
function processJson(obj: JsonValue): JsonValue {
    if (typeof obj === "string") {
        return scrambleValue(obj);
    } else if (Array.isArray(obj)) {
        return obj.map((item) => processJson(item)) as Array<string | JsonObject>;
    } else if (obj !== null && typeof obj === "object") {
        const scrambledObj: JsonObject = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                scrambledObj[key] = processJson(obj[key]) as string | JsonObject;
            }
        }
        return scrambledObj;
    }
    return obj;
}

// Execution block
try {
    const rawData: string = fs.readFileSync(SOURCE_FILE, "utf8");
    const englishJson: JsonValue = JSON.parse(rawData);

    const devJson: JsonValue = processJson(englishJson);

    // Output valid, pretty-printed JSON file content
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(devJson, null, 2), "utf8");
    console.log(`Successfully generated dynamic dev JSON locale layout at: ${OUTPUT_FILE}`);
} catch (error) {
    if (error instanceof Error) {
        console.error("Failed to parse translation dictionary files:", error.message);
    } else {
        console.error("An unknown system error occurred.");
    }
}
