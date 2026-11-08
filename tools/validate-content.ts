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
// error here, so CI cannot pass by checking against nothing. Each scenario's, tutorial's and campaign mission's
// map must be in the folder's maps/ or in the item's own maps/, and for a campaign mission may also be in its
// campaign's shared/maps/.
//
// Maps are read as the client's map scan reads them: .sd7 files only, named by their mapinfo.lua. With or
// without --bundle, a map a campaign ships in more than one place is a warning.
//
// Content whose compatibility is "dev" is an error, so it cannot ship as official content. --allow-dev
// accepts it, as the client does in dev mode, for checking content still in the editor. It names no pair, so
// --bundle passes over it.

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { SHARED_FOLDER } from "../src/main/content/singleplayer/campaign-folder";
import { run7za } from "../src/main/content/singleplayer/mission-archive";
import { loadSingleplayerContent } from "../src/main/content/singleplayer/singleplayer-loader";
import { describeCompatibility, EngineGamePair, isCompatible } from "../src/shared/content/compatibility";
import { DEV_COMPATIBILITY } from "../src/shared/content/schema/common";
import type { ContentProblem, SingleplayerContent } from "../src/shared/content/singleplayer";
import { INSTALL_DEFAULT_FILES, parseDefaultFile } from "../src/shared/install-defaults";
import { springNameFromMapInfo } from "../vendor/map-parser/map-name";

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

// The maps in a maps/ folder, by name, each with its file. A map that can't be read is a warning: any item that
// needs it is reported as missing its map.
export async function readMaps(folder: string): Promise<{ maps: Map<string, string>; problems: ContentProblem[] }> {
    const maps = new Map<string, string>();
    const problems: ContentProblem[] = [];
    const entries = await fs.readdir(folder).catch(() => [] as string[]);
    for (const entry of entries.sort()) {
        const file = path.join(folder, entry);
        if (entry.endsWith(".sdz")) {
            problems.push({ path: file, severity: "warning", message: "Only .sd7 maps are read, as the client reads them, so this map is ignored" });
            continue;
        }
        if (!entry.endsWith(".sd7")) {
            continue;
        }
        const read = await run7za(["x", file, "-so", "mapinfo.lua"]);
        const mapinfo = "error" in read ? undefined : read.stdout.toString();
        try {
            if (!mapinfo) {
                throw new Error("error" in read ? read.error : "it has no mapinfo.lua");
            }
            const name = springNameFromMapInfo(mapinfo, path.parse(entry).name);
            if (!maps.has(name)) {
                maps.set(name, file);
            }
        } catch (error) {
            problems.push({ path: file, severity: "warning", message: `Map name could not be read: ${error instanceof Error ? error.message : error}` });
        }
    }

    return { maps, problems };
}

// The maps content ships itself, keyed by the folder whose maps/ holds them: a scenario's or tutorial's own
// folder, a campaign's shared/, or a campaign mission's own folder.
export type ContentMaps = ReadonlyMap<string, ReadonlyMap<string, string>>;

export function contentMapFolders(content: SingleplayerContent): string[] {
    return [
        ...content.campaigns.flatMap((campaign) => [path.join(campaign.path, SHARED_FOLDER), ...campaign.missions.map((mission) => mission.path)]),
        ...[...content.scenarios, ...content.tutorials].map((item) => item.path),
    ];
}

// Every scenario, tutorial and campaign mission whose map is neither bundled nor shipped where it may look: its
// own maps/, and for a campaign mission also the campaign's shared/maps/.
export function missingMaps(content: SingleplayerContent, bundledMaps: ReadonlySet<string>, contentMaps: ContentMaps): string[] {
    const has = (folder: string, mapName: string) => contentMaps.get(folder)?.has(mapName) ?? false;
    const campaignMissions = content.campaigns
        .filter((campaign) => campaign.compatibility !== DEV_COMPATIBILITY)
        .flatMap((campaign) =>
            campaign.missions
                .filter(({ path: folder, manifest }) => !bundledMaps.has(manifest.mapName) && !has(path.join(campaign.path, SHARED_FOLDER), manifest.mapName) && !has(folder, manifest.mapName))
                .map(
                    ({ id, path: folder, manifest }) =>
                        `campaign ${campaign.id} mission ${id} (${folder}) needs map "${manifest.mapName}", which is in none of the bundle's maps, the campaign's shared/maps or the mission's own maps`
                )
        );
    const items = [...content.scenarios, ...content.tutorials]
        .filter((item) => item.compatibility !== DEV_COMPATIBILITY && !bundledMaps.has(item.manifest.mapName) && !has(item.path, item.manifest.mapName))
        .map((item) => `${item.kind} ${item.id} (${item.path}) needs map "${item.manifest.mapName}", which is in neither the bundle's maps nor its own maps`);

    return [...campaignMissions, ...items];
}

// A campaign keeps each map in one place: in shared/maps when several missions use it, in a mission's own maps/
// when only that mission does. A copy anywhere else is a warning.
export function duplicateCampaignMaps(content: SingleplayerContent, contentMaps: ContentMaps): ContentProblem[] {
    return content.campaigns.flatMap((campaign) => {
        const where = (file: string) => path.relative(campaign.path, file);
        const shared = contentMaps.get(path.join(campaign.path, SHARED_FOLDER));
        const problems: ContentProblem[] = [];
        const inMissions = new Map<string, string[]>();
        for (const mission of campaign.missions) {
            for (const [name, file] of contentMaps.get(mission.path) ?? []) {
                const sharedFile = shared?.get(name);
                if (sharedFile) {
                    problems.push({
                        path: file,
                        severity: "warning",
                        message: `Map "${name}" is also in ${where(sharedFile)}. A map used by several missions belongs only in shared/maps, one used by a single mission only in that mission's maps`,
                    });
                } else {
                    inMissions.set(name, [...(inMissions.get(name) ?? []), file]);
                }
            }
        }
        for (const [name, files] of inMissions) {
            for (const file of files.length > 1 ? files : []) {
                const others = files.filter((other) => other !== file).map(where);
                problems.push({ path: file, severity: "warning", message: `Map "${name}" is also in ${others.join(", ")}. A map used by several missions belongs only in shared/maps` });
            }
        }

        return problems;
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

    const assetsPath = values.bundle === undefined ? undefined : path.resolve(values.bundle);
    const bundle = assetsPath === undefined ? undefined : await readBundle(assetsPath);
    if (bundle && "errors" in bundle) {
        bundle.errors.forEach((error) => console.error(error));
        process.exitCode = 1;
        return;
    }

    const content = await loadSingleplayerContent([{ source: "official", rootId: "official", path: root }], { devContent: values["allow-dev"] });
    for (const problem of content.problems) {
        console.log(`${problem.severity}: ${path.relative(process.cwd(), problem.path)}: ${problem.message}`);
    }

    const mapProblems: ContentProblem[] = [];
    const contentMaps = new Map<string, Map<string, string>>();
    for (const folder of contentMapFolders(content)) {
        const read = await readMaps(path.join(folder, "maps"));
        contentMaps.set(folder, read.maps);
        mapProblems.push(...read.problems);
    }
    mapProblems.push(...duplicateCampaignMaps(content, contentMaps));

    const unbundled: string[] = [];
    if (assetsPath && bundle) {
        const bundled = await readMaps(path.join(assetsPath, "maps"));
        mapProblems.push(...bundled.problems);
        unbundled.push(...unbundledItems(content, bundle.pair), ...missingMaps(content, new Set(bundled.maps.keys()), contentMaps));
    }
    for (const problem of mapProblems) {
        console.log(`${problem.severity}: ${path.relative(process.cwd(), problem.path)}: ${problem.message}`);
    }
    for (const message of unbundled) {
        console.log(`error: ${message}`);
    }

    const problems = [...content.problems, ...mapProblems];
    const warnings = problems.filter((problem) => problem.severity === "warning").length;
    const errors = problems.length - warnings + unbundled.length;
    console.log(`${content.campaigns.length} campaigns, ${content.scenarios.length} scenarios and ${content.tutorials.length} tutorials loaded from ${root}: ${errors} errors, ${warnings} warnings`);
    if (errors > 0) {
        process.exitCode = 1;
    }
}

// The tests import the checks without running the tool.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
    await main();
}
