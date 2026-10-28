// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Runs the client's singleplayer content loader over a content root and prints every problem it finds,
// including the checks that span files, which the exported JSON Schemas cannot do. A last check for CI;
// authors get errors while editing from the schemas in schemas/content/.
//
//   npm run validate-content -- <content root> [--bundle <bundle.json>] [--allow-dev]
//
// --bundle names a JSON file listing the engine and game versions a build ships with, in the same shape as
// `compatibility`: { "bundled": [{ "engineVersion": "…", "gameVersions": ["…"] }] }. Each item must accept
// at least one bundled pair, meaning the same engine and one of that engine's games.
//
// Content whose compatibility is "dev" is an error, so it cannot ship as official content. --allow-dev
// accepts it, as the client does in dev mode, for checking content still in the editor. It names no pair, so
// --bundle passes over it.

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { loadSingleplayerContent } from "../src/main/content/singleplayer/singleplayer-loader";
import { describeCompatibility, isCompatible } from "../src/shared/content/compatibility";
import { Compatibility, DEV_COMPATIBILITY } from "../src/shared/content/schema/common";
import type { SingleplayerContent } from "../src/shared/content/singleplayer";

const Bundle = Type.Object({ bundled: Compatibility });

// Every item that accepts none of the bundled pairs, with what it does accept.
export function unbundledItems(content: SingleplayerContent, bundled: Compatibility): string[] {
    const items = [...content.campaigns, ...content.scenarios, ...content.tutorials];

    return items.flatMap((item) =>
        item.compatibility === DEV_COMPATIBILITY || isCompatible(item.compatibility, bundled)
            ? []
            : [`${item.kind} ${item.id} (${item.path}) runs on none of the bundled engine and game pairs. It accepts: ${describeCompatibility(item.compatibility)}`]
    );
}

async function readBundle(file: string) {
    const bundle = JSON.parse(await fs.readFile(file, "utf8"));
    if (!Value.Check(Bundle, bundle)) {
        const errors = [...Value.Errors(Bundle, bundle)].map((error) => `${error.path} ${error.message}`);
        throw new Error(`${file} is not a bundle file:\n  ${errors.join("\n  ")}`);
    }

    return bundle.bundled;
}

async function main() {
    const { positionals, values } = parseArgs({ allowPositionals: true, options: { bundle: { type: "string" }, "allow-dev": { type: "boolean" } } });
    if (positionals.length !== 1) {
        console.error("Usage: npm run validate-content -- <content root> [--bundle <bundle.json>] [--allow-dev]");
        process.exitCode = 2;
        return;
    }

    const root = path.resolve(positionals[0]);
    try {
        await fs.access(root);
    } catch {
        console.error(`Content root not found: ${root}`);
        process.exitCode = 1;
        return;
    }

    const content = await loadSingleplayerContent([{ source: "official", rootId: "official", path: root }], { devContent: values["allow-dev"] });
    for (const problem of content.problems) {
        console.log(`${problem.severity}: ${path.relative(process.cwd(), problem.path)}: ${problem.message}`);
    }

    const unbundled = values.bundle ? unbundledItems(content, await readBundle(path.resolve(values.bundle))) : [];
    for (const message of unbundled) {
        console.log(`error: ${message}`);
    }

    const warnings = content.problems.filter((problem) => problem.severity === "warning").length;
    const errors = content.problems.length - warnings + unbundled.length;
    console.log(`${content.campaigns.length} campaigns, ${content.scenarios.length} scenarios and ${content.tutorials.length} tutorials loaded from ${root}: ${errors} errors, ${warnings} warnings`);
    if (errors > 0) {
        process.exitCode = 1;
    }
}

// The tests import unbundledItems without running the tool.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
    await main();
}
