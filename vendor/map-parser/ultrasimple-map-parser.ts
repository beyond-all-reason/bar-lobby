import { promises as fs } from "fs";
import { glob } from "glob";
import { LocalStatement, TableConstructorExpression, TableKey, TableKeyString, TableValue, parse } from "luaparse";
import * as os from "os";
import * as path from "path";
import { extractSpecificFiles } from "@main/utils/extract-7z";
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
        const tempArchiveDir = path.join(os.tmpdir(), fileName);
        try {
            if (fileExt !== ".sd7") {
                throw new Error(`${mapFilePath} - ${fileExt} extension is not supported, .sd7 and .sdz only.`);
            }
            const archive = await this.extractSd7(mapFilePath, tempArchiveDir);
            if(!archive.mapInfo) {
                throw new Error(`${mapFilePath} - mapinfo.lua not found in the archive`);
            }
            const mapInfo = await this.parseMapInfo(archive.mapInfo);
            let springName = "";
            if (mapInfo && mapInfo.name && mapInfo.version && mapInfo.name.includes(mapInfo.version!)) {
                springName = mapInfo.name;
            } else if (mapInfo && mapInfo.name) {
                springName = `${mapInfo.name} ${mapInfo.version}`;
            } else if (archive.smfName) {
                springName = archive.smfName;
            }
            this.cleanup(tempArchiveDir);
            return {
                fileName: filePath.name,
                fileNameWithExt: filePath.base,
                springName,
            };
        } catch (err: any) {
            await this.cleanup(tempArchiveDir);
            console.error(err);
            throw err;
        }
    }

    protected async extractSd7(sd7Path: string, outPath: string) {
        const isFileExists = await fs
            .stat(sd7Path)
            .then(() => true)
            .catch(() => false);
        if (!isFileExists) {
            throw new Error(`File not found: ${sd7Path}`);
        }
        await fs.mkdir(outPath, { recursive: true });
        await extractSpecificFiles(sd7Path, outPath, ["mapinfo.lua"]);
        const archiveFiles = await this.extractArchiveFiles(outPath);
        return archiveFiles;
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

    protected async parseMapInfo(buffer: Buffer): Promise<MapInfo> {
        const mapInfoStr = buffer.toString();
        const parsedMapInfo = parse(mapInfoStr, { encodingMode: "x-user-defined", comments: false });
        const rootObj = parsedMapInfo.body[0] as LocalStatement;
        const rootTable = rootObj.init.find((block) => block.type === "TableConstructorExpression") as TableConstructorExpression;
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
