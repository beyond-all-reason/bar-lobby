// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "node:path";
import { CampaignConfig } from "../../../shared/content/schema/campaign-config";
import { Credits } from "../../../shared/content/schema/credits";
import type { ContentRoot, SingleplayerCampaign, SingleplayerMission } from "../../../shared/content/singleplayer";
import { fileInside, isFolder, listFolders, readContentJson, toBarUrl } from "./files";
import { checkCompatibility, readLanguageFolder, readMissionFolder } from "./mission-folder";
import type { Problems } from "./problems";

export const CAMPAIGN_CONFIG_FILE = "campaignConfig.json";
export const CREDITS_FILE = "credits.json";
export const SHARED_FOLDER = "shared";

// Every mission id the config names outside `missions` itself, with where it was named.
function missionReferences(config: CampaignConfig): { id: string; where: string }[] {
    const references = [...config.startMission.map((id) => ({ id, where: "startMission" })), ...config.finalMission.map((id) => ({ id, where: "finalMission" }))];
    for (const [missionId, mission] of Object.entries(config.missions)) {
        for (const field of ["victoryUnlocks", "victoryRemoves", "failureUnlocks", "failureRemoves", "prerequisites"] as const) {
            references.push(...(mission[field] ?? []).map((id) => ({ id, where: `missions.${missionId}.${field}` })));
        }
    }

    return references;
}

// Missions some sequence of results could make available, ignoring removals. A removal can only take a
// mission away, so a mission missing from here can never be played.
function reachableMissions(config: CampaignConfig): Set<string> {
    const known = (id: string) => Object.hasOwn(config.missions, id);
    const reached = new Set(config.startMission.filter(known));
    let grew = true;
    while (grew) {
        const before = reached.size;
        for (const [id, mission] of Object.entries(config.missions)) {
            if (reached.has(id)) {
                [...(mission.victoryUnlocks ?? []), ...(mission.failureUnlocks ?? [])].filter(known).forEach((unlock) => reached.add(unlock));
            }
            const prerequisites = mission.prerequisites ?? [];
            if (prerequisites.length > 0 && prerequisites.every((p) => reached.has(p))) {
                reached.add(id);
            }
        }
        grew = reached.size > before;
    }

    return reached;
}

function checkMissionGraph(config: CampaignConfig, configPath: string, problems: Problems) {
    for (const { id, where } of missionReferences(config)) {
        if (!Object.hasOwn(config.missions, id)) {
            problems.error(configPath, `${where} names mission "${id}", which is not in missions`);
        }
    }

    const reachable = reachableMissions(config);
    for (const id of Object.keys(config.missions).filter((id) => !reachable.has(id))) {
        problems.warning(configPath, `Mission "${id}" can never become available from startMission`);
    }
    if (config.finalMission.length > 0 && !config.finalMission.some((id) => reachable.has(id))) {
        problems.warning(configPath, "No finalMission can become available, so the campaign can never be finished");
    }
}

async function mediaUrl(sharedFolder: string, file: string | undefined, problems: Problems, configPath: string, what: string) {
    if (file === undefined) {
        return undefined;
    }
    const filePath = await fileInside(path.join(sharedFolder, "media"), file, problems, configPath, what);

    return filePath && toBarUrl(filePath);
}

/**
 * Reads one campaign folder and every mission in it. Gives undefined when the campaign or any of its
 * missions has an error, after reporting every problem found.
 */
export async function readCampaignFolder(root: ContentRoot, folder: string, devContent: boolean, problems: Problems): Promise<SingleplayerCampaign | undefined> {
    const id = path.basename(folder);
    const configPath = path.join(folder, CAMPAIGN_CONFIG_FILE);
    const sharedFolder = path.join(folder, SHARED_FOLDER);
    const config = await readContentJson(configPath, CampaignConfig, problems);
    const credits = await readContentJson(path.join(folder, CREDITS_FILE), Credits, problems);
    if (!config) {
        return undefined;
    }

    if (config.campaignId !== id) {
        problems.error(configPath, `campaignId "${config.campaignId}" does not match its folder name "${id}"`);
    }
    if (Object.hasOwn(config.missions, SHARED_FOLDER)) {
        problems.error(configPath, `A mission may not be named "${SHARED_FOLDER}", which is the campaign's shared folder`);
    }
    checkCompatibility(config.compatibility, configPath, devContent, problems);
    checkMissionGraph(config, configPath, problems);

    const folders = new Set((await listFolders(folder)).filter((name) => name !== SHARED_FOLDER));
    for (const name of [...folders].filter((name) => !Object.hasOwn(config.missions, name))) {
        problems.warning(path.join(folder, name), `Folder "${name}" is not a mission in ${CAMPAIGN_CONFIG_FILE}, so it is ignored`);
    }

    const springDataPathsBefore = (await isFolder(sharedFolder)) ? [sharedFolder] : [];
    const missions: SingleplayerMission[] = [];
    for (const missionId of Object.keys(config.missions).filter((missionId) => missionId !== SHARED_FOLDER)) {
        if (!folders.has(missionId)) {
            problems.error(configPath, `Mission "${missionId}" has no folder`);
            continue;
        }
        const mission = await readMissionFolder(
            path.join(folder, missionId),
            {
                partOfCampaign: true,
                devContent,
                springDataPathsBefore,
                mediaFolder: path.join(sharedFolder, "media"),
            },
            problems.child()
        );
        if (mission) {
            missions.push(mission);
        }
    }

    const language = await readLanguageFolder(sharedFolder, problems);
    const backgroundImageUrl = await mediaUrl(sharedFolder, config.backgroundImage, problems, configPath, "backgroundImage");
    const logoUrl = await mediaUrl(sharedFolder, config.logo, problems, configPath, "logo");

    if (problems.hasErrors || !credits) {
        return undefined;
    }

    return {
        kind: "campaign",
        source: root.source,
        rootId: root.rootId,
        id,
        path: folder,
        config,
        credits,
        language,
        backgroundImageUrl,
        logoUrl,
        compatibility: config.compatibility,
        missions,
    };
}
