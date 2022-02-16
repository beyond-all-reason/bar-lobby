import * as path from "path";
import * as fs from "fs";
import * as glob from "glob-promise";
import * as luaparse from "luaparse";
import { LocalStatement, TableConstructorExpression } from "luaparse";
import { AbstractContentAPI } from "@/api/content/abstract-content";
import { AI } from "@/model/ai";
import { EngineTagFormat } from "@/model/formats";

export class AiContentAPI extends AbstractContentAPI {
    protected engineAis: Record<EngineTagFormat, AI[]> = {};

    public async fetchAis(engine: EngineTagFormat) : Promise<AI[]> {
        if (this.engineAis[engine] !== undefined) {
            return this.engineAis[engine];
        }

        const ais: AI[] = [];
        const aisDir = path.join(this.dataDir, "engine", engine, "AI", "Skirmish");
        const aiDirs = await fs.promises.readdir(aisDir);

        for (const aiDir of aiDirs) {
            try {
                const ai = await this.fetchAi(path.join(aisDir, aiDir));
                ais.push(ai);
            } catch (err) {
                console.error(`Error parsing AI: ${aiDir}`, err);
            }
        }

        this.engineAis[engine] = ais;

        return ais;
    }

    protected async fetchAi(aiDirPath: string) : Promise<AI> {
        const filePaths = await glob.promise(`${aiDirPath}/**/{AIInfo.lua,AIOptions.lua,*.dll}`);

        const aiInfoPath = filePaths.find(filePath => filePath.endsWith("AIInfo.lua"));
        const aiOptionsPath = filePaths.find(filePath => filePath.endsWith("AIOptions.lua"));
        const dllPath = filePaths.find(filePath => filePath.endsWith(".dll"));

        if (aiInfoPath === undefined || dllPath === undefined) {
            throw new Error("AIInfo.lua or .dll not found");
        }

        const aiInfoFields = await this.parseAiInfo(aiInfoPath);
        const aiInfo: Record<string, any> = {};
        for (const field of aiInfoFields) {
            aiInfo[field.key] = field.value;
        }

        const ai: AI = {
            id: aiInfo.shortName,
            name: aiInfo.name,
            description: aiInfo.description,
            version: aiInfo.version,
            url: aiInfo.url,
            loadSupported: aiInfo.loadSupported === "yes",
            interfaceShortName: aiInfo.interfaceShortName,
            interfaceVersion: aiInfo.interfaceVersion,
            ddlPath: dllPath,
        };

        if (aiOptionsPath) {
            ai.options = await this.parseAiOptions(aiOptionsPath);
        }

        return ai;
    }

    protected async parseAiInfo(luaFilePath: string) {
        const luaStr = await fs.promises.readFile(luaFilePath);
        const parsedLua = luaparse.parse(luaStr.toString(), { encodingMode: "x-user-defined", comments: false });

        const localStatement = parsedLua.body.find(body => body.type === "LocalStatement") as LocalStatement;
        const infoTable = localStatement.init.find(obj => obj.type === "TableConstructorExpression") as TableConstructorExpression;

        return this.luaTableToObj(infoTable);
    }

    protected async parseAiOptions(luaFilePath: string) {
        const luaStr = await fs.promises.readFile(luaFilePath);
        const parsedLua = luaparse.parse(luaStr.toString(), { encodingMode: "x-user-defined", comments: false });

        const localStatement = parsedLua.body.find(body => body.type === "LocalStatement") as LocalStatement;
        const infoTable = localStatement.init.find(obj => obj.type === "TableConstructorExpression") as TableConstructorExpression;

        return this.luaTableToObj(infoTable);
    }

    protected luaTableToObj(table: TableConstructorExpression) : any {
        const blocks: any[] = [];
        const obj: Record<string, unknown> = {};

        for (const field of table.fields) {
            if (field.type === "TableKeyString") {
                const key = field.key.name;
                if (field.value.type === "StringLiteral" || field.value.type === "NumericLiteral" || field.value.type === "BooleanLiteral") {
                    obj[key] = field.value.value;
                } else if (field.value.type === "TableConstructorExpression") {
                    obj[key] = this.luaTableToObj(field.value);
                }
            } else if (field.type === "TableValue") {
                if (field.value.type === "TableConstructorExpression") {
                    blocks.push(this.luaTableToObj(field.value));
                }
            }
        }

        return blocks.length > 1 ? blocks : obj;
    }
}