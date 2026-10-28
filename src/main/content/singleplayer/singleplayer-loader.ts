// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Reads singleplayer content: campaigns, scenarios and tutorials. Plain Node with the roots passed in, so the
// client, the tests and tools/validate-content.ts all run the same checks.

import fs from "node:fs/promises";
import path from "node:path";
import { IndexManifest } from "../../../shared/content/schema/index-manifest";
import type { ContentProblem, ContentRoot, SingleplayerCampaign, SingleplayerContent, SingleplayerScenario } from "../../../shared/content/singleplayer";
import { readCampaignFolder } from "./campaign-folder";
import { isFile, listFolders, readContentJson } from "./files";
import { MANIFEST_FILE, readMissionFolder } from "./mission-folder";
import { Problems } from "./problems";

export const KIND_FOLDERS = { campaign: "campaigns", scenario: "scenarios", tutorial: "tutorials" } as const;

export type LoadOptions = {
    // Load content whose compatibility is "dev", as the client does in dev mode. Otherwise it is an error.
    devContent?: boolean;
};

const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The item folders under one of campaigns/, scenarios/ or tutorials/, in display order: the order its
 * manifest.json gives, then the rest by id.
 */
async function orderedFolders(kindFolder: string, problems: Problems): Promise<string[]> {
    const names = await listFolders(kindFolder);

    // Ids differing only in case are one folder on Windows and macOS, so content that relies on them breaks there.
    const seen = new Map<string, string>();
    for (const name of names.sort(byCodePoint)) {
        const other = seen.get(name.toLowerCase());
        if (other) {
            problems.error(path.join(kindFolder, name), `Id "${name}" differs from "${other}" only in case`);
        }
        seen.set(name.toLowerCase(), name);
    }

    const manifestPath = path.join(kindFolder, MANIFEST_FILE);
    const order = (await isFile(manifestPath)) ? ((await readContentJson(manifestPath, IndexManifest, problems))?.order ?? []) : [];
    for (const name of order.filter((name) => !names.includes(name))) {
        problems.warning(manifestPath, `order names "${name}", which is not a folder here`);
    }

    return [...order.filter((name) => names.includes(name)), ...names.filter((name) => !order.includes(name))];
}

async function readScenarios(root: ContentRoot, kind: "scenario" | "tutorial", devContent: boolean, all: ContentProblem[]): Promise<SingleplayerScenario[]> {
    const kindFolder = path.join(root.path, KIND_FOLDERS[kind]);
    const items: SingleplayerScenario[] = [];
    for (const name of await orderedFolders(kindFolder, new Problems(all))) {
        const mission = await readMissionFolder(
            path.join(kindFolder, name),
            { partOfCampaign: false, devContent, springDataPathsBefore: [], mediaFolder: path.join(kindFolder, name, "media") },
            new Problems(all)
        );
        // readMissionFolder only gives a scenario with compatibility back.
        if (mission?.manifest.compatibility) {
            items.push({ ...mission, kind, source: root.source, rootId: root.rootId, compatibility: mission.manifest.compatibility });
        }
    }

    return items;
}

async function readCampaigns(root: ContentRoot, devContent: boolean, all: ContentProblem[]): Promise<SingleplayerCampaign[]> {
    const kindFolder = path.join(root.path, KIND_FOLDERS.campaign);
    const items: SingleplayerCampaign[] = [];
    for (const name of await orderedFolders(kindFolder, new Problems(all))) {
        const campaign = await readCampaignFolder(root, path.join(kindFolder, name), devContent, new Problems(all));
        if (campaign) {
            items.push(campaign);
        }
    }

    return items;
}

/**
 * Everything valid under the given roots, in root order and then display order, with every problem found.
 * An item with an error is left out and its problems listed, without hiding anything else.
 */
export async function loadSingleplayerContent(roots: readonly ContentRoot[], { devContent = false }: LoadOptions = {}): Promise<SingleplayerContent> {
    const content: SingleplayerContent = { campaigns: [], scenarios: [], tutorials: [], problems: [] };
    for (const root of roots) {
        try {
            await fs.access(root.path);
        } catch {
            // A root nobody has put content in yet is normal, not a problem.
            continue;
        }
        content.campaigns.push(...(await readCampaigns(root, devContent, content.problems)));
        content.scenarios.push(...(await readScenarios(root, "scenario", devContent, content.problems)));
        content.tutorials.push(...(await readScenarios(root, "tutorial", devContent, content.problems)));
    }

    return content;
}
