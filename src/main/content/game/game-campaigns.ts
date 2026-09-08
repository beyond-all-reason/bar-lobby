// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import Ajv, { JSONSchemaType } from "ajv";
import { CAMPAIGN_IMAGE_PATH } from "@main/config/app";
import { createTranslator, languageCandidates, parseTranslations, Translations } from "@main/content/game/campaign-i18n";
import type { CampaignModel } from "@main/content/game/campaign-model";
import type { CampaignDefinition } from "@main/content/game/generated/campaign";
import type { MissionManifest } from "@main/content/game/generated/manifest";
import type { MissionDefinition } from "@main/content/game/generated/mission";
import { getGameFiles } from "@main/content/game/game-files";
import { AllyTeamModel, MissionBriefing, MissionModel, MissionStartScript, TeamModel } from "@main/content/game/mission";
import { logger } from "@main/utils/logger";
import * as fs from "fs";
import * as path from "path";
import util from "util";
import zlib from "zlib";
import campaignSchema from "./schemas/campaign.schema.json";
import manifestSchema from "./schemas/manifest.schema.json";
import missionSchema from "./schemas/mission.schema.json";

const log = logger("game-campaigns.ts");
const gunzip = util.promisify(zlib.gunzip);
const CAMPAIGNS_PATH = "data/singleplayer/campaigns";
const CAMPAIGNS_MANIFEST_PATH = `${CAMPAIGNS_PATH}/manifest.json`;

const ajv = new Ajv({ allowUnionTypes: true });
const validateCampaignFile = ajv.compile<CampaignDefinition>(campaignSchema as unknown as JSONSchemaType<CampaignDefinition>);
const validateMissionFile = ajv.compile<MissionDefinition>(missionSchema as unknown as JSONSchemaType<MissionDefinition>);
const validateManifestFile = ajv.compile<MissionManifest>(manifestSchema as unknown as JSONSchemaType<MissionManifest>);

type Translate = (key: string) => string;

// Loads campaigns in manifest in order.
export async function getCampaigns(packageMd5: string, language?: string | null): Promise<CampaignModel[]> {
    try {
        const manifest = await readManifest(packageMd5);
        const campaignIds = manifest?.campaigns ?? [];
        if (campaignIds.length === 0) {
            log.warn(`No campaigns listed in ${CAMPAIGNS_MANIFEST_PATH}`);
            return [];
        }

        await fs.promises.mkdir(CAMPAIGN_IMAGE_PATH, { recursive: true });

        const campaigns: CampaignModel[] = [];
        for (const campaignId of campaignIds) {
            try {
                if (campaigns.some((campaign) => campaign.campaignId === campaignId)) {
                    throw new Error(`Duplicate campaignId '${campaignId}' in ${CAMPAIGNS_MANIFEST_PATH}`);
                }
                campaigns.push(await loadCampaign(packageMd5, campaignId, language, CAMPAIGN_IMAGE_PATH));
            } catch (err) {
                log.error(`Error loading campaign '${campaignId}': ${err}`);
            }
        }

        return campaigns;
    } catch (err) {
        log.error(`Error getting campaigns: ${err}`);
        return [];
    }
}

async function readManifest(packageMd5: string): Promise<MissionManifest | undefined> {
    const manifestFiles = await getGameFiles(packageMd5, CAMPAIGNS_MANIFEST_PATH, true);
    if (manifestFiles.length === 0) {
        return undefined;
    }

    const manifestJson = JSON.parse(manifestFiles[0].data.toString("utf8")) as unknown;
    if (!validateManifestFile(manifestJson)) {
        log.warn(`Invalid mission manifest (${CAMPAIGNS_MANIFEST_PATH}): ${ajv.errorsText(validateManifestFile.errors)}`);
        return undefined;
    }

    return manifestJson;
}

async function loadCampaign(packageMd5: string, campaignId: string, language: string | null | undefined, cacheDir: string): Promise<CampaignModel> {
    const campaignPath = `${CAMPAIGNS_PATH}/${campaignId}`;
    const campaignFiles = await getGameFiles(packageMd5, `${campaignPath}/campaign.json`, true);
    if (campaignFiles.length === 0) {
        throw new Error(`No campaign.json found at ${campaignPath}`);
    }

    const campaignJson = JSON.parse(campaignFiles[0].data.toString("utf8")) as unknown;
    if (!validateCampaignFile(campaignJson)) {
        throw new Error(`Invalid campaign JSON (${campaignPath}/campaign.json): ${ajv.errorsText(validateCampaignFile.errors)}`);
    }
    if (campaignJson.campaignId !== campaignId) {
        throw new Error(`campaignId '${campaignJson.campaignId}' does not match its folder name '${campaignId}'`);
    }

    const campaignTranslations = await readTranslations(packageMd5, campaignPath, language);
    const translate = createTranslator(campaignTranslations);

    const logo = campaignJson.logo ? await extractAsset(packageMd5, `${campaignPath}/${campaignJson.logo}`, cacheDir, campaignId) : undefined;
    const backgroundImage = campaignJson.backgroundImage ? await extractAsset(packageMd5, `${campaignPath}/${campaignJson.backgroundImage}`, cacheDir, campaignId) : undefined;

    const missions: Record<string, MissionModel> = {};
    for (const missionFolderName of campaignJson.missions ?? []) {
        try {
            const mission = await loadMission(packageMd5, campaignJson, campaignPath, missionFolderName, language, campaignTranslations, cacheDir);
            if (missions[mission.missionId]) {
                throw new Error(`Duplicate missionId '${mission.missionId}'`);
            }
            missions[mission.missionId] = mission;
        } catch (err) {
            log.error(`Error loading mission '${missionFolderName}' of campaign '${campaignId}': ${err}`);
        }
    }

    const { titleKey, descriptionKey, ...campaignRest } = campaignJson;
    return {
        ...campaignRest,
        title: translate(titleKey),
        description: translate(descriptionKey),
        logo,
        backgroundImage,
        missions,
        unlocked: isCampaignUnlocked(campaignJson),
    };
}

async function loadMission(
    packageMd5: string,
    campaign: CampaignDefinition,
    campaignPath: string,
    missionFolderName: string,
    language: string | null | undefined,
    campaignTranslations: Translations | undefined,
    cacheDir: string
): Promise<MissionModel> {
    const missionFolder = `${campaignPath}/${missionFolderName}`;
    const missionFiles = await getGameFiles(packageMd5, `${missionFolder}/mission.json`, true);
    if (missionFiles.length === 0) {
        throw new Error(`No mission.json found at ${missionFolder}`);
    }

    const missionJson = JSON.parse(missionFiles[0].data.toString("utf8")) as unknown;
    if (!validateMissionFile(missionJson)) {
        throw new Error(`Invalid mission JSON (${missionFolder}/mission.json): ${ajv.errorsText(validateMissionFile.errors)}`);
    }
    if (missionJson.missionId !== missionFolderName) {
        throw new Error(`missionId '${missionJson.missionId}' does not match its folder name '${missionFolderName}'`);
    }

    // A mission's own strings win over its campaign's, so it can override a shared key.
    const missionTranslations = await readTranslations(packageMd5, missionFolder, language);
    const translate = createTranslator(missionTranslations, campaignTranslations);

    const image = missionJson.image ? await extractAsset(packageMd5, `${missionFolder}/${missionJson.image}`, cacheDir, `${campaign.campaignId}_${missionFolderName}`) : undefined;

    const { titleKey, descriptionKey, briefing, startScript, ...missionRest } = missionJson;
    return {
        ...missionRest,
        title: translate(titleKey),
        description: translate(descriptionKey),
        briefing: briefing && resolveBriefing(briefing, translate),
        startScript: resolveStartScript(startScript, translate),
        campaignId: campaign.campaignId,
        missionFolder,
        image,
        unlocked: true,
    };
}

function resolveBriefing(briefing: NonNullable<MissionDefinition["briefing"]>, translate: Translate): MissionBriefing {
    return {
        alliesPresent: briefing.alliesPresent?.map(translate),
        objectives: briefing.objectives?.map(translate),
        knownHostiles: briefing.knownHostiles?.map(translate),
        newUnits: briefing.newUnits?.map(({ unitDefName, descriptionKey }) => ({
            unitDefName,
            description: translate(descriptionKey),
        })),
    };
}

function resolveStartScript(startScript: MissionDefinition["startScript"], translate: Translate): MissionStartScript {
    const allyTeams: Record<string, AllyTeamModel> = {};
    for (const [allyTeamName, allyTeam] of Object.entries(startScript.allyTeams)) {
        const teams: Record<string, TeamModel> = {};
        for (const [teamName, team] of Object.entries(allyTeam.teams)) {
            const { nameKey, ...teamRest } = team;
            teams[teamName] = { ...teamRest, name: translate(nameKey) };
        }
        allyTeams[allyTeamName] = { ...allyTeam, teams };
    }

    return { ...startScript, allyTeams };
}

// Reads `<contentPath>/language/<language>.json`, falling back to English.
async function readTranslations(packageMd5: string, contentPath: string, language: string | null | undefined): Promise<Translations | undefined> {
    for (const candidate of languageCandidates(language)) {
        const languagePath = `${contentPath}/language/${candidate}.json`;
        try {
            const files = await getGameFiles(packageMd5, languagePath, true);
            if (files.length === 0) continue;
            return parseTranslations(files[0].data);
        } catch (err) {
            log.warn(`Error reading translations (${languagePath}): ${err}`);
        }
    }
    return undefined;
}

function isCampaignUnlocked(campaign: CampaignDefinition): boolean {
    return (campaign.prerequisites?.length ?? 0) === 0;
}

async function extractAsset(packageMd5: string, filePath: string, cacheDir: string, prefix: string): Promise<string | undefined> {
    try {
        const files = await getGameFiles(packageMd5, filePath, false);
        if (files.length === 0) return undefined;

        const file = files[0];
        const buffer = await readFileDecompressed(file.archivePath);
        const cacheFileName = `${prefix}_${path.basename(filePath)}`;
        const cachePath = path.join(cacheDir, cacheFileName);
        await fs.promises.writeFile(cachePath, buffer);

        return cachePath;
    } catch {
        return undefined;
    }
}

async function readFileDecompressed(archivePath: string): Promise<Buffer> {
    const data = await fs.promises.readFile(archivePath);
    return archivePath.endsWith(".gz") ? gunzip(data) : data;
}
