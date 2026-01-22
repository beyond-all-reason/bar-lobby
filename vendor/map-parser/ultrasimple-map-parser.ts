// SPDX-FileCopyrightText: 2023 Jazcash
// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT
// SPDX-FileAttributionText: Original code from https://github.com/beyond-all-reason/map-parser, heavily rewritten here

import { promises as fs } from "fs";
import { glob } from "glob";
import { LocalStatement, TableConstructorExpression, TableKey, TableKeyString, TableValue, parse } from "luaparse";
import * as path from "path";
import { readSpecificFile } from "@main/utils/extract-7z";
import { MapInfo } from "$/map-parser/map-model";

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
            const mapInfo = await this.parseMapInfo(rawMapinfo);
            let springName = "";
            if (mapInfo && mapInfo.name && mapInfo.version && mapInfo.name.includes(mapInfo.version!)) {
                springName = mapInfo.name;
            } else if (mapInfo && mapInfo.name) {
                springName = `${mapInfo.name} ${mapInfo.version}`;
            } else if (mapInfo.smtFileName) {
                springName = mapInfo.smtFileName;
            } else {
                springName = fileName;
            }
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

    protected async parseMapInfo(mapinfo: string): Promise<MapInfo> {
        const parsedMapInfo = parse(mapinfo, { encodingMode: "x-user-defined", comments: false });

        if (!parsedMapInfo.body || parsedMapInfo.body.length === 0) {
            console.warn("Map info is empty or malformed.");
            return {} as MapInfo;
        }

        const rootObj = parsedMapInfo.body[0];

        if (rootObj.type !== "LocalStatement" || !rootObj.init || rootObj.init.length === 0) {
            console.warn("Map info root object is not a LocalStatement or is missing init property.");
            return {} as MapInfo;
        }

        const rootTable = rootObj.init.find((block) => block.type === "TableConstructorExpression");

        if (!rootTable || rootTable.type !== "TableConstructorExpression") {
            console.warn("Map info root table is not a TableConstructorExpression.");
            return {} as MapInfo;
        }

        const obj = this.parseMapInfoFields(rootTable.fields);
        return obj as MapInfo;
    }

    protected parseMapInfoFields(fields: (TableKey | TableKeyString | TableValue)[]) {
        const arr: any = [];
        const obj: any = {};
        for (const field of fields) {
            if (field.type === "TableKeyString") {
                if (field.value.type === "StringLiteral" || field.value.type === "NumericLiteral" || field.value.type === "BooleanLiteral") {
                    obj[field.key.name] = field.value.value;
                } else if (field.value.type === "UnaryExpression" && field.value.argument.type === "NumericLiteral") {
                    obj[field.key.name] = -field.value.argument.value;
                } else if (field.value.type === "TableConstructorExpression") {
                    obj[field.key.name] = this.parseMapInfoFields(field.value.fields);
                }
            } else if (field.type === "TableValue") {
                if (field.value.type === "StringLiteral" || field.value.type === "NumericLiteral" || field.value.type === "BooleanLiteral") {
                    const val = field.value.value;
                    arr.push(val);
                }
            } else if (field.type === "TableKey") {
                if (field.value.type === "StringLiteral" || field.value.type === "NumericLiteral" || field.value.type === "BooleanLiteral") {
                    if (field.key.type === "NumericLiteral") {
                        arr[field.key.type] = field.value.value;
                    }
                } else if (field.value.type === "UnaryExpression" && field.value.argument.type === "NumericLiteral") {
                    arr[field.key.type] = -field.value.argument.value;
                } else if (field.value.type === "TableConstructorExpression") {
                    arr.push(this.parseMapInfoFields(field.value.fields));
                }
            }
        }
        if (arr.length) {
            return arr;
        }
        return obj;
    }

    protected async cleanup(tmpDir: string) {
        try {
            await fs.rm(tmpDir, { recursive: true, force: true });
        } catch (err) {
            console.error(err);
        }
    }
}
