// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Runs the client's singleplayer content loader over a content root and prints every problem it finds,
// including the checks that span files, which the exported JSON Schemas cannot do. A last check for CI;
// authors get errors while editing from the schemas in schemas/content/.
//
//   npm run validate-content -- <content root> [--bundle <assets folder>] [--allow-dev]
//
// --bundle names an install's assets folder. Its engine/default.txt and games/default.txt name the one engine
// and game the install ships, read as the client reads them. Each item's compatibility must accept that pair,
// and its archive's modinfo.lua must depend on that game. Unlike the client, a missing or empty file is an
// error here, so CI cannot pass by checking against nothing.
//
// Content whose compatibility is "dev" is an error, so it cannot ship as official content. --allow-dev
// accepts it, as the client does in dev mode, for checking content still in the editor. It names no pair, so
// --bundle passes over it.

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { loadSingleplayerContent } from "../src/main/content/singleplayer/singleplayer-loader";
import { describeCompatibility, EngineGamePair, isCompatible } from "../src/shared/content/compatibility";
import { DEV_COMPATIBILITY } from "../src/shared/content/schema/common";
import type { SingleplayerContent } from "../src/shared/content/singleplayer";
import { INSTALL_DEFAULT_FILES, parseDefaultFile } from "../src/shared/install-defaults";

// The pair an assets folder's default.txt files name, or why it names none.
export async function readBundle(assetsPath: string): Promise<{ pair: EngineGamePair } | { errors: string[] }> {
    const read = async (type: keyof typeof INSTALL_DEFAULT_FILES): Promise<{ version: string } | { error: string }> => {
        const file = path.join(assetsPath, ...INSTALL_DEFAULT_FILES[type]);
        const text = await fs.readFile(file, "utf8").catch(() => undefined);
        const version = parseDefaultFile(text);

        return version ? { version } : { error: `${file} is ${text === undefined ? "missing" : "empty"}, so the bundle names no ${type}` };
    };
    const engine = await read("engine");
    const game = await read("game");
    if ("version" in engine && "version" in game) {
        return { pair: { engineVersion: engine.version, gameVersion: game.version } };
    }

    return { errors: [engine, game].flatMap((result) => ("error" in result ? [result.error] : [])) };
}

// Every item that can't run on the bundled pair, with the reason.
export function unbundledItems(content: SingleplayerContent, { engineVersion, gameVersion }: EngineGamePair): string[] {
    const items = [...content.campaigns, ...content.scenarios, ...content.tutorials];

    return items.flatMap((item) => {
        if (item.compatibility === DEV_COMPATIBILITY) {
            return [];
        }
        const name = `${item.kind} ${item.id} (${item.path})`;
        const failures: string[] = [];
        if (!isCompatible(item.compatibility, [{ engineVersion, gameVersions: [gameVersion] }])) {
            failures.push(`${name} doesn't run on the bundled engine ${engineVersion} with game ${gameVersion}. It accepts: ${describeCompatibility(item.compatibility)}`);
        }
        if (item.archiveDepend && !item.archiveDepend.includes(gameVersion)) {
            failures.push(`${name} has an archive whose modinfo.lua depend doesn't name the bundled game ${gameVersion}`);
        }

        return failures;
    });
}

async function main() {
    const { positionals, values } = parseArgs({ allowPositionals: true, options: { bundle: { type: "string" }, "allow-dev": { type: "boolean" } } });
    if (positionals.length !== 1) {
        console.error("Usage: npm run validate-content -- <content root> [--bundle <assets folder>] [--allow-dev]");
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

    const bundle = values.bundle === undefined ? undefined : await readBundle(path.resolve(values.bundle));
    if (bundle && "errors" in bundle) {
        bundle.errors.forEach((error) => console.error(error));
        process.exitCode = 1;
        return;
    }

    const content = await loadSingleplayerContent([{ source: "official", rootId: "official", path: root }], { devContent: values["allow-dev"] });
    for (const problem of content.problems) {
        console.log(`${problem.severity}: ${path.relative(process.cwd(), problem.path)}: ${problem.message}`);
    }

    const unbundled = bundle ? unbundledItems(content, bundle.pair) : [];
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

// The tests import the checks without running the tool.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
    await main();
}
