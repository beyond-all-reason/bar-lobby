// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import Ajv, { JSONSchemaType } from "ajv";
import { CAMPAIGN_IMAGE_PATH } from "@main/config/app";
import type { CampaignModel } from "@main/content/game/campaign-model";
import type { CampaignDefinition } from "@main/content/game/generated/campaign";
import type { MissionManifest } from "@main/content/game/generated/manifest";
import type { MissionDefinition } from "@main/content/game/generated/mission";
import { getGameFiles } from "@main/content/game/game-files";
import { MissionModel } from "@main/content/game/mission";
import type { SdpFile, SdpFileMeta } from "@main/content/game/sdp";
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
const CAMPAIGNS_PATH = "missions/campaigns";

const ajv = new Ajv({ allowUnionTypes: true });
const validateCampaignFile = ajv.compile<CampaignDefinition>(campaignSchema as unknown as JSONSchemaType<CampaignDefinition>);
const validateMissionFile = ajv.compile<MissionDefinition>(missionSchema as unknown as JSONSchemaType<MissionDefinition>);
const validateManifestFile = ajv.compile<MissionManifest>(manifestSchema as unknown as JSONSchemaType<MissionManifest>);

export async function getCampaigns(packageMd5: string): Promise<CampaignModel[]> {
    try {
        const manifest = await readManifest(packageMd5);
        const campaignJsonFiles = sortedByPath(await getGameFiles(packageMd5, `${CAMPAIGNS_PATH}/*/campaign.json`, true));
        await fs.promises.mkdir(CAMPAIGN_IMAGE_PATH, { recursive: true });

        const campaigns: CampaignModel[] = [];
        for (const campaignFile of campaignJsonFiles) {
            try {
                const campaign = await parseCampaignFile(campaignFile, packageMd5, CAMPAIGN_IMAGE_PATH);
                if (campaigns.some((c) => c.campaignId === campaign.campaignId)) {
                    throw new Error(`Duplicate campaignId '${campaign.campaignId}'`);
                }
                campaigns.push(campaign);
            } catch (err) {
                log.error(`Error parsing campaign ${sdpRelativePath(campaignFile)}: ${err}`);
            }
        }

        return orderByIds(campaigns, manifest?.campaigns, (campaign) => campaign.campaignId, (a, b) => a.campaignId.localeCompare(b.campaignId));
    } catch (err) {
        log.error(`Error getting campaigns: ${err}`);
        return [];
    }
}

async function readManifest(packageMd5: string): Promise<MissionManifest | undefined> {
    const manifestFiles = await getGameFiles(packageMd5, "missions/manifest.json", true);
    if (manifestFiles.length === 0) {
        return undefined;
    }

    const manifestJson = JSON.parse(manifestFiles[0].data.toString("utf8")) as unknown;
    if (!validateManifestFile(manifestJson)) {
        log.warn(`Invalid mission manifest (${sdpRelativePath(manifestFiles[0])}): ${ajv.errorsText(validateManifestFile.errors)}`);
        return undefined;
    }

    return manifestJson;
}

async function parseCampaignFile(campaignFile: SdpFile, packageMd5: string, cacheDir: string): Promise<CampaignModel> {
    const campaignJson = JSON.parse(campaignFile.data.toString("utf8")) as unknown;
    if (!validateCampaignFile(campaignJson)) {
        throw new Error(`Invalid campaign JSON (${sdpRelativePath(campaignFile)}): ${ajv.errorsText(validateCampaignFile.errors)}`);
    }

    const campaignDirName = containingDirName(campaignFile);
    const campaignPath = `${CAMPAIGNS_PATH}/${campaignDirName}`;
    const logo = campaignJson.logo ? await extractAsset(packageMd5, `${campaignPath}/${campaignJson.logo}`, cacheDir, campaignDirName) : undefined;
    const backgroundImage = campaignJson.backgroundImage
        ? await extractAsset(packageMd5, `${campaignPath}/${campaignJson.backgroundImage}`, cacheDir, campaignDirName)
        : undefined;

    const missionJsonFiles = sortedByPath(await getGameFiles(packageMd5, `${campaignPath}/*/mission.json`, true));
    const parsedMissions: MissionModel[] = [];

    for (const missionFile of missionJsonFiles) {
        const missionDirName = containingDirName(missionFile);
        try {
            const mission = await parseMissionFile(missionFile, packageMd5, campaignJson, campaignDirName, cacheDir);
            if (parsedMissions.some((m) => m.missionId === mission.missionId)) {
                throw new Error(`Duplicate missionId '${mission.missionId}'`);
            }
            parsedMissions.push(mission);
        } catch (err) {
            log.error(`Error parsing mission ${missionDirName} in ${campaignDirName}: ${err}`);
        }
    }

    const orderedMissions = orderByIds(parsedMissions, campaignJson.missions, (mission) => mission.missionId, (a, b) => a.missionId.localeCompare(b.missionId));
    const missions = Object.fromEntries(orderedMissions.map((mission) => [mission.missionId, mission]));

    return { ...campaignJson, logo, backgroundImage, missions, unlocked: isCampaignUnlocked(campaignJson) };
}

async function parseMissionFile(missionFile: SdpFile, packageMd5: string, campaign: CampaignDefinition, campaignDirName: string, cacheDir: string): Promise<MissionModel> {
    const missionJson = JSON.parse(missionFile.data.toString("utf8")) as unknown;
    if (!validateMissionFile(missionJson)) {
        throw new Error(`Invalid mission JSON (${sdpRelativePath(missionFile)}): ${ajv.errorsText(validateMissionFile.errors)}`);
    }

    const missionDirName = containingDirName(missionFile);
    const missionFolder = `${CAMPAIGNS_PATH}/${campaignDirName}/${missionDirName}`;
    const image = missionJson.image ? await extractAsset(packageMd5, `${missionFolder}/${missionJson.image}`, cacheDir, `${campaignDirName}_${missionDirName}`) : undefined;

    return {
        ...missionJson,
        campaignId: campaign.campaignId,
        missionFolder,
        image,
        unlocked: isMissionUnlocked(campaign, missionJson.missionId),
    };
}

function isCampaignUnlocked(campaign: CampaignDefinition): boolean {
    return (campaign.prerequisites?.length ?? 0) === 0;
}

function isMissionUnlocked(_campaign: CampaignDefinition, _missionId: string): boolean {
    return true;
}

function orderByIds<T>(items: T[], orderedIds: string[] | undefined, getId: (item: T) => string, fallbackSort: (a: T, b: T) => number): T[] {
    if (!orderedIds || orderedIds.length === 0) {
        return [...items].sort(fallbackSort);
    }

    const idOrder = new Map(orderedIds.map((id, index) => [id, index]));
    return [...items].sort((a, b) => {
        const indexA = idOrder.get(getId(a));
        const indexB = idOrder.get(getId(b));

        if (indexA !== undefined && indexB !== undefined) {
            return indexA - indexB;
        }
        if (indexA !== undefined) {
            return -1;
        }
        if (indexB !== undefined) {
            return 1;
        }

        return fallbackSort(a, b);
    });
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

function sdpRelativePath(file: SdpFileMeta): string {
    return file.fileName.includes("/") ? file.fileName : file.archivePath;
}

function containingDirName(file: SdpFileMeta): string {
    return path.basename(path.dirname(sdpRelativePath(file).replaceAll("\\", "/")));
}

function sortedByPath<T extends SdpFileMeta>(files: T[]): T[] {
    return [...files].sort((a, b) => sdpRelativePath(a).localeCompare(sdpRelativePath(b)));
}
