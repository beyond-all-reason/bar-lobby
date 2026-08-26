// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { SCENARIO_IMAGE_PATH } from "@main/config/app";
import { getGameFiles } from "@main/content/game/game-files";
import { Scenario } from "@main/content/game/scenario";
import { logger } from "@main/utils/logger";
import { parseLuaTable } from "@main/utils/parse-lua-table";
import * as fs from "fs";
import * as path from "path";
import util from "util";
import zlib from "zlib";

const log = logger("game-scenarios.ts");
const gunzip = util.promisify(zlib.gunzip);

export async function getScenarios(packageMd5: string): Promise<Scenario[]> {
    try {
        const scenarioImages = await getGameFiles(packageMd5, "singleplayer/scenarios/*.{jpg,png}", false);
        const scenarioDefinitions = (await getGameFiles(packageMd5, "singleplayer/scenarios/*.lua", true)).filter(({ fileName }) => /[^/]*scenario[^/]*$/.test(fileName));
        const cacheDir = SCENARIO_IMAGE_PATH;

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
                const scenario = parseLuaTable(scenarioDefinition.data) as Scenario;
                if (scenario.imagepath) {
                    log.debug(`Imagepath: ${scenario.imagepath}`);
                    scenario.imagepath = path.join(cacheDir, scenario.imagepath).replaceAll("\\", "/");
                } else {
                    log.warn(`No imagepath for scenario: ${scenario.title}`);
                }
                scenario.summary = scenario.summary.replace(/\[|\]/g, "");
                scenario.briefing = scenario.briefing.replace(/\[|\]/g, "");
                scenario.allowedsides = Array.isArray(scenario.allowedsides) && scenario.allowedsides[0] !== "" ? scenario.allowedsides : ["Armada", "Cortext", "Random"];
                scenario.startscript = scenario.startscript.slice(1, -1);
                scenarios.push(scenario);
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
