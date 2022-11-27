import axios from "axios";
import * as fs from "fs";
import { removeFromArray } from "jaz-ts-utils";
import { Octokit } from "octokit";
import * as path from "path";
import { reactive } from "vue";

import { AbstractContentAPI } from "@/api/content/abstract-content";
import { contentSources } from "@/config/content-sources";
import { extract7z } from "@/utils/extract7z";
import { DownloadInfo } from "$/model/downloads";

export const engineVersionRegex = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)-(?<revision>\d+)-g(?<sha>[0-9a-f]+) (?<branch>.*)$/i;
export const gitEngineTagRegex = /^.*?\{(?<branch>.*?)\}(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)-(?<revision>\d+)-g(?<sha>[0-9a-f]+)$/i;

export class EngineContentAPI extends AbstractContentAPI {
    public readonly installedVersions: string[] = reactive([]);

    protected readonly engineDir = path.join(api.info.contentPath, "engine");
    protected readonly ocotokit = new Octokit();

    public override async init() {
        await fs.promises.mkdir(this.engineDir, { recursive: true });

        const engineDirs = await fs.promises.readdir(this.engineDir);

        for (const dir of engineDirs) {
            if (this.isEngineVersionString(dir)) {
                this.installedVersions.push(dir);
            }
        }

        this.sortVersions();

        return this;
    }

    public async downloadLatestEngine() {
        const latestEngineReleaseTag = await this.getLatestEngineReleaseTag();
        const engineVersion = this.gitEngineTagToEngineVersionString(latestEngineReleaseTag);

        return this.downloadEngine(engineVersion);
    }

    public async downloadEngine(engineVersion: string) {
        if (this.installedVersions.includes(engineVersion)) {
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

        this.onDownloadStart.dispatch(downloadInfo);

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

        const downloadPath = path.join(api.info.contentPath, "engine");
        const downloadFile = path.join(downloadPath, asset.name);

        await fs.promises.mkdir(downloadPath, { recursive: true });
        await fs.promises.writeFile(downloadFile, Buffer.from(engine7z), { encoding: "binary" });

        await extract7z(downloadFile, engineVersion);

        await fs.promises.unlink(downloadFile);

        this.installedVersions.push(engineVersion);
        this.sortVersions();

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

    protected sortVersions() {
        this.installedVersions.sort((a, b) => {
            const aParts = this.parseEngineVersionParts(a);
            const bParts = this.parseEngineVersionParts(b);

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

    protected isEngineVersionString(version: string): boolean {
        return engineVersionRegex.test(version);
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
}
