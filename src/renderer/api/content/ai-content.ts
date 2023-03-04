import * as fs from "fs";
import * as glob from "glob-promise";
import { clone } from "jaz-ts-utils";
import * as path from "path";
import { reactive } from "vue";

import { AbstractContentAPI } from "@/api/content/abstract-content";
import type { EngineAI } from "@/model/ai";
import { gameAis } from "@/model/ai";
import { parseLuaOptions } from "@/utils/parse-lua-options";
import { parseLuaTable } from "@/utils/parse-lua-table";

export class AiContentAPI extends AbstractContentAPI {
    protected readonly installedAis: Record<string, EngineAI[]> = reactive({});

    // TODO: cache AIs and load on init
    public async processAis(engine: string): Promise<void> {
        const ai = this.installedAis[engine];
        if (ai !== undefined) {
            return;
        }

        const ais: EngineAI[] = [];
        const aisDir = path.join(api.info.contentPath, "engine", engine, "AI", "Skirmish");

        if (!fs.existsSync(aisDir)) {
            console.error(`Tried to process AIs for an engine version that is not installed: ${engine}`);
            return;
        }

        const aiDirs = await fs.promises.readdir(aisDir);

        for (const aiDir of aiDirs) {
            try {
                const ai = await this.fetchAi(path.join(aisDir, aiDir));
                ais.push(ai);
            } catch (err) {
                console.error(`Error parsing AI: ${aiDir}`, err);
            }
        }

        this.installedAis[engine] = ais;
    }

    public getAis(engine: string): string[] {
        if (!this.installedAis[engine]) {
            console.error(`Tried to fetch AIs from an engine version that hasn't been installed or processed yet`);
            return [];
        }

        const ais = clone(this.installedAis[engine]);
        const engineAI = ais?.map((ai) => ai.shortName) ?? [];
        return [...engineAI, ...gameAis];
    }

    public getEngineAI(name: string, engine: string): EngineAI | undefined {
        return this.installedAis[engine]?.find((ai) => ai.shortName === name);
    }

    protected async fetchAi(aiDirPath: string): Promise<EngineAI> {
        const filePaths = await glob.promise(`${aiDirPath}/**/{AIInfo.lua,AIOptions.lua,*.dll,*.so}`);

        const aiInfoPath = filePaths.find((filePath) => filePath.endsWith("AIInfo.lua"));
        const aiOptionsPath = filePaths.find((filePath) => filePath.endsWith("AIOptions.lua"));
        const dllPath = filePaths.find((filePath) => filePath.endsWith(".dll") || filePath.endsWith(".so"));

        if (aiInfoPath === undefined) {
            throw new Error("AIInfo.lua or AIOptions.lua not found");
        }

        if (dllPath === undefined) {
            throw new Error(".dll or .so not found");
        }

        const aiInfoFile = await fs.promises.readFile(aiInfoPath);
        const aiInfoFields = parseLuaTable(aiInfoFile);
        console.log(aiInfoFields);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aiInfo: Record<string, any> = {};
        for (const field of aiInfoFields) {
            aiInfo[field.key] = field.value;
        }

        const ai: EngineAI = {
            shortName: aiInfo.shortName,
            name: aiInfo.name,
            description: aiInfo.description,
            version: aiInfo.version,
            url: aiInfo.url,
            loadSupported: aiInfo.loadSupported === "yes",
            interfaceShortName: aiInfo.interfaceShortName,
            interfaceVersion: aiInfo.interfaceVersion,
            ddlPath: dllPath,
            options: [],
        };

        if (aiOptionsPath) {
            const aiOptionsFile = await fs.promises.readFile(aiOptionsPath);
            ai.options = parseLuaOptions(aiOptionsFile);
        }

        return ai;
    }
}
