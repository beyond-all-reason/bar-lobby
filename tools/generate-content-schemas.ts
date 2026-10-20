// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Writes a standalone JSON Schema for each singleplayer content file into schemas/content/, from the
// TypeBox definitions the client validates with. Each file stands alone so an authoring tool can copy just
// the one it needs.
//
//   npm run generate-content-schemas            writes the files
//   npm run generate-content-schemas -- --check fails if the committed files differ from the definitions

import fs from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";
import type { TSchema } from "@sinclair/typebox";
import { CampaignConfig } from "../src/shared/content/schema/campaign-config";
import { Credits } from "../src/shared/content/schema/credits";
import { IndexManifest } from "../src/shared/content/schema/index-manifest";
import { LanguageFile } from "../src/shared/content/schema/language-file";
import { MissionConfig } from "../src/shared/content/schema/mission-config";
import { MissionManifest } from "../src/shared/content/schema/mission-manifest";

export const SCHEMAS_FOLDER = path.resolve(import.meta.dirname, "..", "schemas", "content");
const ID_BASE = "https://raw.githubusercontent.com/beyond-all-reason/bar-lobby/master/schemas/content/";

export const contentSchemas: Record<string, TSchema> = {
    "index-manifest": IndexManifest,
    "campaign-config": CampaignConfig,
    credits: Credits,
    "mission-manifest": MissionManifest,
    "mission-config": MissionConfig,
    "language-file": LanguageFile,
};

// Hover docs are the point of these files, so a property without them is a mistake in the definitions.
function assertDocumented(schema: Record<string, unknown>, where: string) {
    for (const [name, property] of Object.entries((schema.properties ?? {}) as Record<string, Record<string, unknown>>)) {
        if (typeof property.title !== "string" || typeof property.description !== "string") {
            throw new Error(`${where}.${name} needs a title and a description`);
        }
        assertDocumented(property, `${where}.${name}`);
    }
    for (const key of ["items", "additionalProperties"]) {
        if (schema[key] && typeof schema[key] === "object") {
            assertDocumented(schema[key] as Record<string, unknown>, `${where}.${key}`);
        }
    }
    for (const child of Object.values((schema.patternProperties ?? {}) as Record<string, Record<string, unknown>>)) {
        assertDocumented(child, `${where}.*`);
    }
}

export async function renderSchema(name: string, schema: TSchema): Promise<string> {
    // Through JSON to drop TypeBox's symbol keys.
    const plain = JSON.parse(JSON.stringify(schema));
    assertDocumented(plain, name);
    const standalone = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `${ID_BASE}${name}.schema.json`, ...plain };
    const fileName = path.join(SCHEMAS_FOLDER, `${name}.schema.json`);

    return prettier.format(JSON.stringify(standalone), { ...(await prettier.resolveConfig(fileName)), filepath: fileName });
}

async function main() {
    const check = process.argv.includes("--check");
    await fs.mkdir(SCHEMAS_FOLDER, { recursive: true });

    const stale: string[] = [];
    for (const [name, schema] of Object.entries(contentSchemas)) {
        const fileName = path.join(SCHEMAS_FOLDER, `${name}.schema.json`);
        const rendered = await renderSchema(name, schema);
        const current = await fs.readFile(fileName, "utf8").catch(() => undefined);
        if (current === rendered) {
            continue;
        }
        if (check) {
            stale.push(fileName);
        } else {
            await fs.writeFile(fileName, rendered);
            console.log(`Wrote ${path.relative(process.cwd(), fileName)}`);
        }
    }

    if (stale.length > 0) {
        console.error(`Out of date with src/shared/content/schema. Run npm run generate-content-schemas:\n  ${stale.join("\n  ")}`);
        process.exitCode = 1;
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
    await main();
}
