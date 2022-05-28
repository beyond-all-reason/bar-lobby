import axios from "axios";
import * as fs from "fs";
import { lastInArray, removeFromArray } from "jaz-ts-utils";
import { Octokit } from "octokit";
import * as path from "path";
import { reactive } from "vue";

import { AbstractContentAPI } from "@/api/content/abstract-content-api";
import { contentSources } from "@/config/content-sources";
import type { DownloadInfo } from "@/model/downloads";
import { EngineVersionFormat, gitEngineTagToEngineVersionString } from "@/model/formats";
import { isEngineVersionString } from "@/model/formats";
import { extract7z } from "@/utils/extract7z";

export class EngineContentAPI extends AbstractContentAPI {
    public installedVersions: EngineVersionFormat[] = reactive([]);

    protected ocotokit = new Octokit();

    public async init() {
        const engineDir = path.join(this.dataDir, "engine");
        await fs.promises.mkdir(engineDir, { recursive: true });
        const engineDirs = await fs.promises.readdir(engineDir);

        for (const dir of engineDirs) {
            if (isEngineVersionString(dir)) {
                this.installedVersions.push(dir);
            }
        }

        this.sortEngineVersions();

        return this;
    }

    public async downloadLatestEngine(includePrerelease = true): Promise<EngineVersionFormat> {
        const latestEngineRelease = await this.getLatestEngineReleaseInfo();

        if (lastInArray(this.installedVersions) === gitEngineTagToEngineVersionString(latestEngineRelease.tag_name)) {
            console.log(`Latest engine version already installed: ${lastInArray(this.installedVersions)}`);
            return lastInArray(this.installedVersions)!;
        }

        const engineVersionString = gitEngineTagToEngineVersionString(latestEngineRelease.tag_name);

        const archStr = process.platform === "win32" ? "windows" : "linux";
        const asset = latestEngineRelease.assets.find((asset) => asset.name.includes(archStr) && asset.name.includes("portable"));
        if (!asset) {
            throw new Error("Couldn't fetch latest engine release");
        }

        const downloadInfo: DownloadInfo = reactive({
            type: "engine",
            name: engineVersionString,
            currentBytes: 0,
            totalBytes: 1,
        });

        const downloadResponse = await axios({
            url: asset.browser_download_url,
            method: "get",
            responseType: "arraybuffer",
            headers: { "Content-Type": "application/7z" },
            adapter: require("axios/lib/adapters/http"),
            onDownloadProgress: (progress) => {
                downloadInfo.currentBytes = progress.loaded;
                downloadInfo.totalBytes = progress.total;
            },
        });

        const engine7z = downloadResponse.data as ArrayBuffer;

        const downloadPath = path.join(this.dataDir, "engine");
        const downloadFile = path.join(downloadPath, asset.name);

        await fs.promises.mkdir(downloadPath, { recursive: true });
        await fs.promises.writeFile(downloadFile, Buffer.from(engine7z), { encoding: "binary" });

        await extract7z(downloadFile, engineVersionString);

        await fs.promises.unlink(downloadFile);

        this.installedVersions.push(engineVersionString);
        this.sortEngineVersions();

        removeFromArray(this.currentDownloads, downloadInfo);

        await api.content.ai.processAis(engineVersionString);

        return engineVersionString;
    }

    public async downloadEngine(engineTag: EngineVersionFormat) {
        // TODO
    }

    public async getLatestEngineReleaseInfo() {
        // if and when the engine releases switches to not marking every release as prerelease then we should use the getLatestRelease octokit method
        const releasesResponse = await this.ocotokit.rest.repos.listReleases({
            owner: contentSources.engineGitHub.owner,
            repo: contentSources.engineGitHub.repo,
            per_page: 1,
        });

        return releasesResponse.data[0];
    }

    public async getEngineReleaseInfo(engineTag: EngineVersionFormat) {
        try {
            const baseTag = engineTag.slice(4);
            const majorVersion = baseTag.split(".")[0];
            const gitTag = `spring_bar_{BAR${majorVersion}}${baseTag}`;

            const release = await this.ocotokit.rest.repos.getReleaseByTag({
                owner: contentSources.engineGitHub.owner,
                repo: contentSources.engineGitHub.repo,
                tag: gitTag,
            });

            return release;
        } catch (err) {
            console.error(err);
            throw new Error(`Couldn't get engine release for tag: ${engineTag}`);
        }
    }

    public async isLatestEngineVersionInstalled() {
        const latestEngineVersion = await this.getLatestEngineReleaseInfo();
        const engineTag = gitEngineTagToEngineVersionString(latestEngineVersion.tag_name);

        return this.isEngineVersionInstalled(engineTag);
    }

    // arg format should match dir name, e.g. BAR-105.1.1-809-g3f69f26
    public async isEngineVersionInstalled(engineTag: EngineVersionFormat) {
        return fs.existsSync(path.join(this.dataDir, "engine", engineTag));
    }

    protected isVersionGreater(a: EngineVersionFormat, b: EngineVersionFormat): boolean {
        const [aGame, aVersion, aRevision, aSha] = a.split("-");
        const [bGame, bVersion, bRevision, bSha] = b.split("-");

        const [aMajor, aMinor, aPatch] = aVersion.split(".");
        const [bMajor, bMinor, bPatch] = bVersion.split(".");

        if (aMajor > bMajor || aMinor > bMinor || aPatch > bPatch || aRevision > bRevision) {
            return true;
        }

        return false;
    }

    protected sortEngineVersions() {
        return Array.from(this.installedVersions).sort((a, b) => (this.isVersionGreater(a, b) ? 1 : -1));
    }
}
