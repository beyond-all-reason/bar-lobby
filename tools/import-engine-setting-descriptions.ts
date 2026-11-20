// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Adds the engine's own descriptions of its config variables to the English strings, as
// lobby.navbar.settings.engine.descriptions.<key>, from a cached listing such as
// state/engine-config/config-vars/<engine version>.json. New and changed descriptions are written; ones the
// engine no longer has are kept, since an older engine may still use them. Run generate-i18n-assets after.
//
//   node --import=tsx tools/import-engine-setting-descriptions.ts <config-vars.json>

import * as fs from "node:fs";
import * as path from "node:path";

const SOURCE_FILE = path.join("lang", "en", "lobby.json");

// Characters vue-i18n's message syntax gives a meaning, written as literals.
const escapeMessage = (text: string) => text.replace(/[{}@|]/g, (char) => `{'${char}'}`);

const listingPath = process.argv[2];
if (!listingPath) {
    console.error("Usage: node --import=tsx tools/import-engine-setting-descriptions.ts <config-vars.json>");
    process.exit(1);
}

const listing = JSON.parse(fs.readFileSync(listingPath, "utf8")) as { vars?: Record<string, { description?: string }> };
if (!listing.vars) {
    console.error(`${listingPath} has no vars: is it a cached config var listing?`);
    process.exit(1);
}

const source = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8"));
const engine = source.lobby.navbar.settings.engine;
const descriptions: Record<string, string> = engine.descriptions ?? {};

let added = 0;
let changed = 0;
for (const [key, { description }] of Object.entries(listing.vars)) {
    if (!description?.trim()) {
        continue;
    }
    const text = escapeMessage(description.trim());
    if (!Object.hasOwn(descriptions, key)) {
        added++;
    } else if (descriptions[key] !== text) {
        changed++;
    } else {
        continue;
    }
    descriptions[key] = text;
}

engine.descriptions = Object.fromEntries(Object.entries(descriptions).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
fs.writeFileSync(SOURCE_FILE, JSON.stringify(source, null, 4) + "\n");
console.log(`${SOURCE_FILE}: ${added} description(s) added, ${changed} changed`);
