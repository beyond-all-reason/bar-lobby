import axios from "axios";
import * as fs from "fs";
import { removeFromArray } from "jaz-ts-utils";
import { Octokit } from "octokit";
import * as path from "path";
import { reactive } from "vue";

import { AbstractContentAPI } from "@/api/content/abstract-content-api";
import { contentSources } from "@/config/content-sources";
import { DownloadInfo } from "@/model/downloads";
import { extract7z } from "@/utils/extract7z";

export const engineVersionRegex = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)-(?<revision>\d+)-g(?<sha>[0-9a-f]+) (?<branch>.*)$/i;

export const gitEngineTagRegex = /^.*?\{(?<branch>.*?)\}(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)-(?<revision>\d+)-g(?<sha>[0-9a-f]+)$/i;

export class EngineContentAPI extends AbstractContentAPI {
    public installedVersions: string[] = reactive([]);

    protected ocotokit = new Octokit();

    public async init() {
        const engineDir = path.join(api.info.contentPath, "engine");
        await fs.promises.mkdir(engineDir, { recursive: true });
        const engineDirs = await fs.promises.readdir(engineDir);

        for (const dir of engineDirs) {
            if (this.isEngineVersionString(dir)) {
                this.installedVersions.push(dir);
            }
        }

        this.sortEngineVersions();

        return this;
    }

    public async downloadLatestEngine() {
        const latestEngineReleaseTag = await this.getLatestEngineReleaseTag();
        const engineVersion = this.gitEngineTagToEngineVersionString(latestEngineReleaseTag);

        return this.downloadEngine(engineVersion);
    }

    public async downloadEngine(engineVersion: string) {
        if (this.installedVersions.includes(engineVersion)) {
            console.log(`Engine version already installed: ${engineVersion}`);
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
            throw new Error("Failed to fetch latest engine release asset");
        }

        const downloadInfo: DownloadInfo = reactive({
            type: "engine",
            name: engineVersion,
            currentBytes: 0,
            totalBytes: 1,
        });

        this.currentDownloads.push(downloadInfo);

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

        const downloadPath = path.join(api.info.contentPath, "engine");
        const downloadFile = path.join(downloadPath, asset.name);

        await fs.promises.mkdir(downloadPath, { recursive: true });
        await fs.promises.writeFile(downloadFile, Buffer.from(engine7z), { encoding: "binary" });

        await extract7z(downloadFile, engineVersion);

        await fs.promises.unlink(downloadFile);

        this.installedVersions.push(engineVersion);
        this.sortEngineVersions();

        removeFromArray(this.currentDownloads, downloadInfo);
        this.onDownloadComplete.dispatch(downloadInfo);

        await api.content.ai.processAis(engineVersion);

        return engineVersion;
    }

    public async getLatestEngineReleaseTag() {
        // if the engine releases switch to not marking every release as prerelease then we should use the repos.getLatestRelease octokit method instead
        const releasesResponse = await this.ocotokit.rest.repos.listReleases({
            owner: contentSources.engineGitHub.owner,
            repo: contentSources.engineGitHub.repo,
            per_page: 1,
        });

        return releasesResponse.data[0].tag_name;
    }

    public async getEngineReleaseInfo(engineTag: string) {
        try {
            const release = await this.ocotokit.rest.repos.getReleaseByTag({
                owner: contentSources.engineGitHub.owner,
                repo: contentSources.engineGitHub.repo,
                tag: engineTag,
            });

            return release;
        } catch (err) {
            console.error(err);
            throw new Error(`Couldn't get engine release for tag: ${engineTag}`);
        }
    }

    public async isLatestEngineVersionInstalled() {
        const latestEngineTag = await this.getLatestEngineReleaseTag();
        const engineVersion = this.gitEngineTagToEngineVersionString(latestEngineTag);

        return this.isEngineVersionInstalled(engineVersion);
    }

    public isEngineVersionInstalled(engineTag: string) {
        return this.installedVersions.includes(engineTag);
    }

    protected isVersionGreater(a: string, b: string): boolean {
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

    protected isEngineVersionString(version: string): boolean {
        return engineVersionRegex.test(version);
    }
}
