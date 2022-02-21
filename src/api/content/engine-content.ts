import * as fs from "fs";
import * as path from "path";
import { EngineTagFormat, isEngineTag } from "@/model/formats";
import { extract7z } from "@/utils/extract7z";
import axios from "axios";
import { Octokit } from "octokit";
import { Signal } from "jaz-ts-utils";
import { AbstractContentAPI } from "@/api/content/abstract-content";
import { contentSources } from "@/config/content-sources";

export class EngineContentAPI extends AbstractContentAPI {
    public onDlProgress: Signal<{ currentBytes: number; totalBytes: number }> = new Signal();

    protected ocotokit = new Octokit();

    public async init() {
        return this;
    }

    public async downloadLatestEngine(includePrerelease = true) {
        const latestEngineRelease = await this.getLatestEngineReleaseInfo();

        const archStr = process.platform === "win32" ? "windows" : "linux";
        const asset = latestEngineRelease.assets.find(asset => asset.name.includes(archStr) && asset.name.includes("portable"));
        if (!asset) {
            throw new Error("Couldn't fetch latest engine release");
        }

        const downloadResponse = await axios({
            url: asset.browser_download_url,
            method: "get",
            responseType: "arraybuffer",
            headers: { "Content-Type": "application/7z" },
            adapter: require("axios/lib/adapters/http"),
            onDownloadProgress: (progress) => {
                this.onDlProgress.dispatch({
                    currentBytes: progress.loaded,
                    totalBytes: progress.total
                });
            }
        });

        const engine7z = downloadResponse.data as ArrayBuffer;

        const downloadPath = path.join(this.dataDir, "engine");
        const downloadFile = path.join(downloadPath, asset.name);

        await fs.promises.mkdir(downloadPath, { recursive: true });
        await fs.promises.writeFile(downloadFile, Buffer.from(engine7z), { encoding: "binary" });

        const engineVersionString = this.engineTagNameToVersionString(latestEngineRelease.tag_name);

        await extract7z(downloadFile, engineVersionString);

        await fs.promises.unlink(downloadFile);
    }

    public async downloadEngine(engineTag: EngineTagFormat) {
        // TODO
    }

    public async getLatestEngineReleaseInfo() {
        // if and when the engine releases switches to not marking every release as prerelease then we should use the getLatestRelease octokit method
        const releasesResponse = await this.ocotokit.rest.repos.listReleases({
            owner: contentSources.engineGitHub.owner,
            repo: contentSources.engineGitHub.repo,
            per_page: 1
        });

        return releasesResponse.data[0];
    }

    public async getEngineRelease(engineTag: EngineTagFormat) {
        try {
            const baseTag = engineTag.slice(4);
            const majorVersion = baseTag.split(".")[0];
            const gitTag = `spring_bar_{BAR${majorVersion}}${baseTag}`;

            const release = await this.ocotokit.rest.repos.getReleaseByTag({
                owner: contentSources.engineGitHub.owner,
                repo: contentSources.engineGitHub.repo,
                tag: gitTag
            });

            return release;
        } catch (err) {
            console.error(err);
            throw new Error(`Couldn't get engine release for tag: ${engineTag}`);
        }
    }

    public async getInstalledEngineVersions() {
        const engineVersions: EngineTagFormat[] = [];

        const engineDir = path.join(this.dataDir, "engine");
        const engineDirs = await fs.promises.readdir(engineDir);

        for (const dir of engineDirs) {
            if (isEngineTag(dir)) {
                engineVersions.push(dir);
            }
        }

        return engineVersions;
    }

    public async getLatestInstalledEngineVersion() {
        const installedEngineVersions = await this.getInstalledEngineVersions();
        return installedEngineVersions[installedEngineVersions.length - 1];
    }

    // arg format should match dir name, e.g. BAR-105.1.1-809-g3f69f26
    public async isEngineVersionInstalled(engineTag: EngineTagFormat) {
        return fs.existsSync(path.join(this.dataDir, "engine", engineTag));
    }

    public async isLatestEngineVersionInstalled() {
        const latestEngineVersion = await this.getLatestEngineReleaseInfo();
        const engineTag = this.engineTagNameToVersionString(latestEngineVersion.tag_name);

        return this.isEngineVersionInstalled(engineTag);
    }

    // spring_bar_{BAR105}105.1.1-807-g98b14ce -> BAR-105.1.1-809-g3f69f26
    protected engineTagNameToVersionString(tagName: string) : EngineTagFormat {
        try {
            const versionString = `BAR-${tagName.split("}")[1]}`;
            if (isEngineTag(versionString)) {
                return versionString;
            } else {
                throw new Error();
            }
        } catch (err) {
            console.error(err);
            throw new Error("Couldn't parse engine version string from tag name");
        }
    }
}