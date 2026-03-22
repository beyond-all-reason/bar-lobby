// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as fs from "node:fs";
import * as path from "node:path";
import util from "node:util";
import zlib from "node:zlib";
import { logger } from "@main/utils/logger";
import { parseLuaTable } from "@main/utils/parse-lua-table";
import { CampaignModel } from "@main/content/game/campaign";
import { AllyTeamModel, MapOptions, MissionDifficulty, MissionModel, MissionModOptions } from "@main/content/game/mission";
import { Scenario } from "@main/content/game/scenario";
import { GameVersion } from "@main/content/game/game-version";
import { SdpFile, SdpFileMeta } from "@main/content/game/sdp";

const log = logger("campaign-content.ts");
const gunzip = util.promisify(zlib.gunzip);

/** Raw shape of a campaign Lua file as returned by {@link parseLuaTable}. */
type RawCampaignLua = {
    campaignId: string;
    title: string;
    description: string;
    unlocked?: boolean;
    logo?: string;
    backgroundImage?: string;
    difficulties?: MissionDifficulty[];
    defaultDifficulty?: string;
    disableFactionPicker?: boolean;
};

/** Raw shape of the `lobbyData` table in a mission Lua file. */
type RawLobbyData = {
    missionId?: string | number;
    title?: string;
    description?: string;
    image?: string;
    startPos?: { x: number; y: number };
    unlocked?: boolean;
};

/**
 * Raw shape of the `startScript` table in a mission Lua file.
 */
type RawStartScript = {
    mapName?: string;
    startPosType?: string;
    players?: { min: number; max: number };
    difficulties?: MissionDifficulty[];
    defaultDifficulty?: string;
    disableFactionPicker?: boolean;
    disableInitialCommanderSpawn?: boolean;
    modOptions?: MissionModOptions;
    mapOptions?: MapOptions;
    unitLimits?: Record<string, number>;
    allyTeams?: Record<string, AllyTeamModel>;
};

/** Callbacks injected by {@link GameContentAPI} to avoid circular dependency. */
export type GameFilesDeps = {
    getMeta(md5: string, pattern: string): Promise<SdpFileMeta[]>;
    getData(md5: string, pattern: string): Promise<SdpFile[]>;
};

function sdpRelativePath(file: SdpFileMeta): string {
    return file.fileName.includes("/") ? file.fileName : file.archivePath;
}

async function extractAsset(
    deps: GameFilesDeps,
    md5: string,
    filePath: string,
    cacheDir: string,
    /** Prefix prepended to the cached filename to avoid collisions across campaigns. */
    prefix: string
): Promise<string | null> {
    try {
        const files = await deps.getMeta(md5, filePath);
        if (files.length === 0) return null;
        const file = files[0];
        let buffer: Buffer;
        if (file.archivePath.endsWith(".gz")) {
            const data = await fs.promises.readFile(file.archivePath);
            buffer = await gunzip(data);
        } else {
            buffer = await fs.promises.readFile(file.archivePath);
        }
        const cacheFileName = `${prefix}_${path.basename(filePath)}`;
        const cachePath = path.join(cacheDir, cacheFileName);
        await fs.promises.writeFile(cachePath, buffer);
        return cachePath;
    } catch {
        return null;
    }
}

async function parseMissionFile(
    missionFile: SdpFile,
    deps: GameFilesDeps,
    md5: string,
    campaignId: string,
    campaignDirName: string,
    cacheDir: string
): Promise<MissionModel> {
    const missionFolder = path.parse(sdpRelativePath(missionFile)).name;
    const lobbyData = parseLuaTable(missionFile.data, { tableVariableName: "lobbyData" }) as RawLobbyData;
    const startScript = parseLuaTable(missionFile.data, { tableVariableName: "startScript" }) as RawStartScript;

    const image = lobbyData.image
        ? await extractAsset(
              deps,
              md5,
              `missions/campaigns/${campaignDirName}/${missionFolder}/${lobbyData.image}`,
              cacheDir,
              `${campaignDirName}_${missionFolder}`
          )
        : null;

    return {
        campaignId,
        missionId: String(lobbyData.missionId ?? missionFolder),
        missionScriptPath: `missions/campaigns/${campaignDirName}/${missionFolder}.lua`,
        title: lobbyData.title ?? "",
        description: lobbyData.description ?? "",
        image,
        startPos: lobbyData.startPos ?? { x: 0.25, y: 0.25 },
        unlocked: lobbyData.unlocked ?? false,
        mapName: startScript.mapName ?? "",
        startPosType: startScript.startPosType ?? "chooseBeforeGame",
        players: startScript.players ?? { min: 1, max: 4 },
        ...(Array.isArray(startScript.difficulties) && {
            difficulties: startScript.difficulties,
            defaultDifficulty: startScript.defaultDifficulty ?? "",
        }),
        disableFactionPicker: startScript.disableFactionPicker,
        disableInitialCommanderSpawn: startScript.disableInitialCommanderSpawn,
        modOptions: startScript.modOptions ?? {},
        mapOptions: startScript.mapOptions ?? {},
        unitLimits: startScript.unitLimits ?? {},
        allyTeams: startScript.allyTeams ?? {},
    };
}

async function parseCampaignFile(
    campaignFile: SdpFile,
    deps: GameFilesDeps,
    version: GameVersion,
    cacheDir: string
): Promise<CampaignModel> {
    const rawCampaign = parseLuaTable(campaignFile.data) as RawCampaignLua;
    const campaignDirName = path.parse(sdpRelativePath(campaignFile)).name;

    const logo = await extractAsset(
        deps,
        version.packageMd5,
        `missions/campaigns/${campaignDirName}/${rawCampaign.logo}`,
        cacheDir,
        campaignDirName
    );
    const backgroundImage = await extractAsset(
        deps,
        version.packageMd5,
        `missions/campaigns/${campaignDirName}/${rawCampaign.backgroundImage}`,
        cacheDir,
        campaignDirName
    );

    const missionLuaFiles = await deps.getData(version.packageMd5, `missions/campaigns/${campaignDirName}/*.lua`);
    const missions: Record<string, MissionModel> = {};

    for (const missionFile of missionLuaFiles) {
        const missionFolder = path.parse(sdpRelativePath(missionFile)).name;
        try {
            const mission = await parseMissionFile(missionFile, deps, version.packageMd5, rawCampaign.campaignId, campaignDirName, cacheDir);
            missions[mission.missionId] = mission;
        } catch (err) {
            log.error(`Error parsing mission ${missionFolder} in ${campaignDirName}: ${err}`);
        }
    }

    return {
        campaignId: rawCampaign.campaignId,
        title: rawCampaign.title,
        description: rawCampaign.description,
        unlocked: rawCampaign.unlocked ?? true,
        logo,
        backgroundImage,
        difficulties: Array.isArray(rawCampaign.difficulties) ? rawCampaign.difficulties : [],
        defaultDifficulty: rawCampaign.defaultDifficulty ?? "",
        disableFactionPicker: !!rawCampaign.disableFactionPicker,
        missions,
    };
}

function parseScenarioDefinition(scenarioDefinition: SdpFile, cacheDir: string): Scenario {
    const scenario = parseLuaTable(scenarioDefinition.data) as Scenario;
    if (scenario.imagepath) {
        log.debug(`Imagepath: ${scenario.imagepath}`);
        scenario.imagepath = path.join(cacheDir, scenario.imagepath).replaceAll("\\", "/");
    } else {
        log.warn(`No imagepath for scenario: ${scenario.title}`);
    }
    scenario.summary = scenario.summary.replaceAll(/[[\]]/g, "");
    scenario.briefing = scenario.briefing.replaceAll(/[[\]]/g, "");
    scenario.allowedsides =
        Array.isArray(scenario.allowedsides) && scenario.allowedsides[0] !== ""
            ? scenario.allowedsides
            : ["Armada", "Cortext", "Random"];
    scenario.startscript = scenario.startscript.slice(1, -1);
    return scenario;
}

/**
 * Reads all campaigns for the given game version.
 *
 * Campaign Lua files live at `missions/campaigns/<name>.lua`, sibling to their
 * directory `missions/campaigns/<name>/`. Each mission inside a campaign is a
 * Lua file `missions/campaigns/<name>/<missionFolder>.lua`, sibling to the
 * mission's own subdirectory.
 */
export async function getCampaigns(version: GameVersion, deps: GameFilesDeps, cacheDir: string): Promise<CampaignModel[]> {
    try {
        const campaignLuaFiles = await deps.getData(version.packageMd5, "missions/campaigns/*.lua");
        await fs.promises.mkdir(cacheDir, { recursive: true });

        const campaigns: CampaignModel[] = [];

        for (const campaignFile of campaignLuaFiles) {
            try {
                campaigns.push(await parseCampaignFile(campaignFile, deps, version, cacheDir));
            } catch (err) {
                log.error(`Error parsing campaign ${campaignFile.fileName}: ${err}`);
            }
        }

        return campaigns;
    } catch (err) {
        log.error(`Error getting campaigns: ${err}`);
        return [];
    }
}

/**
 * Reads all scenarios for the given game version.
 */
export async function getScenarios(version: GameVersion, deps: GameFilesDeps, cacheDir: string): Promise<Scenario[]> {
    try {
        const scenarioImages = await deps.getMeta(version.packageMd5, "singleplayer/scenarios/*.{jpg,png}");
        const scenarioDefinitions = (await deps.getData(version.packageMd5, "singleplayer/scenarios/*.lua")).filter(
            ({ fileName }) => /[^/]*scenario[^/]*$/.test(fileName)
        );

        await fs.promises.mkdir(cacheDir, { recursive: true });

        for (const scenarioImage of scenarioImages) {
            let buffer: Buffer;
            if (scenarioImage.archivePath.endsWith(".gz")) {
                const data = await fs.promises.readFile(scenarioImage.archivePath);
                buffer = await gunzip(data);
            } else {
                buffer = await fs.promises.readFile(scenarioImage.archivePath);
            }
            const fileName = path.parse(scenarioImage.fileName).base;
            await fs.promises.writeFile(path.join(cacheDir, fileName), buffer);
        }

        const scenarios: Scenario[] = [];

        for (const scenarioDefinition of scenarioDefinitions) {
            try {
                scenarios.push(parseScenarioDefinition(scenarioDefinition, cacheDir));
            } catch (err) {
                console.error(`error parsing scenario lua file: ${scenarioDefinition.fileName}`, err);
            }
        }

        scenarios.sort((a, b) => a.index - b.index);
        return scenarios;
    } catch (err) {
        log.error(`Error getting scenarios: ${err}`);
        return [];
    }
}
