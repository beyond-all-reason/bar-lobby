import axios from "axios";
import * as fs from "fs";
import * as glob from "glob-promise";
import { removeFromArray } from "jaz-ts-utils";
import { Octokit } from "octokit";
import * as path from "path";
import { reactive } from "vue";

import { AbstractContentAPI } from "@/api/content/abstract-content";
import { contentSources } from "@/config/content-sources";
import { EngineAI, EngineVersion } from "@/model/cache/engine-version";
import { DownloadInfo } from "@/model/downloads";
import { extract7z } from "@/utils/extract7z";
import { parseLuaOptions } from "@/utils/parse-lua-options";
import { parseLuaTable } from "@/utils/parse-lua-table";

export const engineVersionRegex = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)-(?<revision>\d+)-g(?<sha>[0-9a-f]+) (?<branch>.*)$/i;
export const gitEngineTagRegex = /^.*?\{(?<branch>.*?)\}(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)-(?<revision>\d+)-g(?<sha>[0-9a-f]+)$/i;

export class EngineContentAPI extends AbstractContentAPI<EngineVersion> {
    protected readonly engineDirs = path.join(api.info.contentPath, "engine");
    protected readonly ocotokit = new Octokit();

    public override async init() {
        await fs.promises.mkdir(this.engineDirs, { recursive: true });

        const engineVersions = await api.cacheDb.selectFrom("engineVersion").selectAll().execute();

        for (const version of engineVersions) {
            this.installedVersions.push(version);
        }

        const files = await fs.promises.readdir(this.engineDirs, { withFileTypes: true });
        const dirs = files.filter((file) => file.isDirectory()).map((dir) => dir.name);
        for (const dir of dirs) {
            if (!this.isVersionInstalled(dir)) {
                await this.addEngine(dir, false);
            }
        }

        this.sortVersions();

        return this;
    }

    public isVersionInstalled(id: string): boolean {
        return this.installedVersions.some((installedVersion) => installedVersion.id === id);
    }

    public async downloadEngine(engineVersion: string) {
        if (this.isVersionInstalled(engineVersion)) {
            return;
        }

        const releaseTag = this.engineVersionToGitEngineTag(engineVersion);

        const { data } = await this.ocotokit.rest.repos.getReleaseByTag({
            owner: contentSources.engineGitHub.owner,
            repo: contentSources.engineGitHub.repo,
            tag: releaseTag,
        });

        if (!data) {
            throw new Error(`Couldn't find engine release for tag: ${engineVersion}`);
        }

        const archStr = process.platform === "win32" ? "windows" : "linux";
        const asset = data.assets.find((asset) => asset.name.includes(archStr) && asset.name.includes("portable"));
        if (!asset) {
            throw new Error("Failed to fetch engine release asset");
        }

        const downloadInfo: DownloadInfo = reactive({
            type: "engine",
            name: engineVersion,
            currentBytes: 0,
            totalBytes: 1,
        });

        this.currentDownloads.push(downloadInfo);

        this.downloadStarted(downloadInfo);

        const downloadResponse = await axios({
            url: asset.browser_download_url,
            method: "get",
            responseType: "arraybuffer",
            headers: { "Content-Type": "application/7z" },
            onDownloadProgress: (progress) => {
                downloadInfo.currentBytes = progress.loaded;
                downloadInfo.totalBytes = progress.total;
            },
        });

        const engine7z = downloadResponse.data as ArrayBuffer;

        const downloadFile = path.join(this.engineDirs, asset.name);

        await fs.promises.mkdir(this.engineDirs, { recursive: true });
        await fs.promises.writeFile(downloadFile, Buffer.from(engine7z), { encoding: "binary" });

        await extract7z(downloadFile, engineVersion);

        await fs.promises.unlink(downloadFile);

        removeFromArray(this.currentDownloads, downloadInfo);
        this.downloadComplete(downloadInfo);

        return engineVersion;
    }

    public async uninstallVersion(version: EngineVersion) {
        const engineDir = path.join(this.engineDirs, version.id);
        await fs.promises.rm(engineDir, { force: true, recursive: true });

        await this.uncacheVersion(version);

        removeFromArray(this.installedVersions, version);
    }

    protected async uncacheVersion(version: EngineVersion) {
        await api.cacheDb.deleteFrom("engineVersion").where("id", "=", version.id).execute();
    }

    protected sortVersions() {
        this.installedVersions.sort((a, b) => {
            const aParts = this.parseEngineVersionParts(a.id);
            const bParts = this.parseEngineVersionParts(b.id);

            if (aParts.major > bParts.major) {
                return 1;
            } else if (aParts.major < bParts.major) {
                return -1;
            }

            if (aParts.revision > bParts.revision) {
                return 1;
            } else if (aParts.revision < bParts.revision) {
                return -1;
            }

            return 0;
        });
    }

    /**
     * BAR-105.1.1-814-g9774f22 -> spring_bar_{BAR105}105.1.1-814-g9774f22
     * if the git tag format ever changes then this will need updating
     * */
    protected engineVersionToGitEngineTag(engineVersionString: string) {
        const { major, minor, patch, revision, sha, branch } = engineVersionString.match(engineVersionRegex)!.groups!;
        return `spring_bar_{${branch}}${major}.${minor}.${patch}-${revision}-g${sha}`;
    }

    /**
     * spring_bar_{BAR105}105.1.1-814-g9774f22 -> BAR-105.1.1-814-g9774f22
     * if the git tag format ever changes then this will need updating
     * */
    protected gitEngineTagToEngineVersionString(gitEngineTag: string) {
        const { major, minor, patch, revision, sha, branch } = gitEngineTag.match(gitEngineTagRegex)!.groups!;
        return `${major}.${minor}.${patch}-${revision}-g${sha} BAR${major}`;
    }

    protected parseEngineVersionParts(engineVersionString: string) {
        const { major, minor, patch, revision, sha, branch } = engineVersionString.match(engineVersionRegex)!.groups!;
        return {
            major: parseInt(major),
            minor: parseInt(minor),
            patch: parseInt(patch),
            revision: parseInt(revision),
            sha,
            branch,
        };
    }

    protected override async downloadComplete(downloadInfo: DownloadInfo) {
        await this.addEngine(downloadInfo.name, true);

        super.downloadComplete(downloadInfo);
    }

    protected async addEngine(id: string, sort = true) {
        if (this.isVersionInstalled(id)) {
            return;
        }

        const ais = await this.parseAis(id);

        const engineVersion = await api.cacheDb.insertInto("engineVersion").values({ id, ais }).returningAll().executeTakeFirstOrThrow();

        this.installedVersions.push(engineVersion);

        if (sort) {
            this.sortVersions();
        }
    }

    protected async parseAis(engineVersion: string): Promise<EngineAI[]> {
        const ais: EngineAI[] = [];

        const aisPath = path.join(this.engineDirs, engineVersion, "AI", "Skirmish");
        const aiDirs = await fs.promises.readdir(aisPath);
        for (const aiDir of aiDirs) {
            try {
                const ai = await this.parseAi(path.join(aisPath, aiDir));
                ais.push(ai);
            } catch (err) {
                console.error(`Error parsing AI: ${aiDir}`, err);
            }
        }

        return ais;
    }

    protected async parseAi(aiPath: string): Promise<EngineAI> {
        const aiDefinitions = await glob.promise(`${aiPath}/**/{AIInfo.lua,AIOptions.lua}`);
        const aiInfoPath = aiDefinitions.find((filePath) => filePath.endsWith("AIInfo.lua"));
        const aiOptionsPath = aiDefinitions.find((filePath) => filePath.endsWith("AIOptions.lua"));

        if (aiInfoPath === undefined) {
            throw new Error(`AIInfo.lua not found in ${aiPath}`);
        }

        if (aiOptionsPath === undefined) {
            throw new Error(`AIOptions.lua not found in ${aiPath}`);
        }

        const aiInfoFile = await fs.promises.readFile(aiInfoPath);
        const aiInfoFields = parseLuaTable(aiInfoFile);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aiInfo: Record<string, any> = {};
        for (const field of aiInfoFields) {
            aiInfo[field.key] = field.value;
        }

        const aiOptionsFile = await fs.promises.readFile(aiOptionsPath);
        const aiOptions = parseLuaOptions(aiOptionsFile);

        return {
            shortName: aiInfo.shortName,
            name: aiInfo.name,
            description: aiInfo.description,
            version: aiInfo.version,
            options: aiOptions,
        };
    }
}
