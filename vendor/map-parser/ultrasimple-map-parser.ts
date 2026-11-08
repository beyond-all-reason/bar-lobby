// SPDX-FileCopyrightText: 2023 Jazcash
// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT
// SPDX-FileAttributionText: Original code from https://github.com/beyond-all-reason/map-parser, heavily rewritten here

import { promises as fs } from "fs";
import { glob } from "glob";
import * as path from "path";
import { readSpecificFile } from "@main/utils/extract-7z";
import { springNameFromMapInfo } from "$/map-parser/map-name";

export class UltraSimpleMapParser {
    public async parseMap(mapFilePath: string): Promise<{
        fileName: string;
        fileNameWithExt: string;
        springName: string;
    }> {
        const filePath = path.parse(mapFilePath);
        const fileName = filePath.name;
        const fileExt = filePath.ext;
        try {
            if (fileExt !== ".sd7") {
                throw new Error(`${mapFilePath} - ${fileExt} extension is not supported, .sd7 and .sdz only.`);
            }
            const rawMapinfo = await readSpecificFile(mapFilePath, "mapinfo.lua")
            const springName = springNameFromMapInfo(rawMapinfo, fileName);
            return {
                fileName: filePath.name,
                fileNameWithExt: filePath.base,
                springName,
            };
        } catch (err: any) {
            console.error(err);
            throw err;
        }
    }

    protected async extractArchiveFiles(outPath: string) {
        const files = glob.sync(`${outPath}/**/*`, {
            windowsPathsNoEscape: true,
        });
        const smfPath = files.find((filePath) => filePath.match(/.*\.smf/))!;
        const mapInfoPath = files.find((filePath) => path.resolve(filePath) === path.join(outPath, "/", "mapinfo.lua"));
        const smfName = smfPath ? path.parse(smfPath).name : undefined;
        const mapInfo = mapInfoPath ? await fs.readFile(mapInfoPath) : undefined;
        return { smfName, mapInfo };
    }

    protected async cleanup(tmpDir: string) {
        try {
            await fs.rm(tmpDir, { recursive: true, force: true });
        } catch (err) {
            console.error(err);
        }
    }
}
