// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Runs the client's singleplayer content loader over a content root and prints every problem it finds,
// including the checks that span files, which the exported JSON Schemas cannot do. A last check for CI;
// authors get errors while editing from the schemas in schemas/content/.
//
//   npm run validate-content -- <content root> [--allow-dev]
//
// Content whose compatibility is "dev" is an error, so it cannot ship as official content. --allow-dev
// accepts it, as the client does in dev mode, for checking content still in the editor.

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { loadSingleplayerContent } from "../src/main/content/singleplayer/singleplayer-loader";

async function main() {
    const { positionals, values } = parseArgs({ allowPositionals: true, options: { "allow-dev": { type: "boolean" } } });
    if (positionals.length !== 1) {
        console.error("Usage: npm run validate-content -- <content root> [--allow-dev]");
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

    const warnings = content.problems.filter((problem) => problem.severity === "warning").length;
    const errors = content.problems.length - warnings;
    console.log(`${content.campaigns.length} campaigns, ${content.scenarios.length} scenarios and ${content.tutorials.length} tutorials loaded from ${root}: ${errors} errors, ${warnings} warnings`);
    if (errors > 0) {
        process.exitCode = 1;
    }
}

await main();
