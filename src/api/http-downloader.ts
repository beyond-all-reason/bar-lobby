import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { Signal } from "jaz-ts-utils";
import { Octokit } from "octokit";
import { extract7z } from "../utils/extract7z";

export class HTTPDownloaderAPI {
    public onProgress: Signal<{ currentBytes: number; totalBytes: number }> = new Signal();

    protected contentPath: string;
    protected ocotokit = new Octokit();

    constructor(contentPath: string) {
        this.contentPath = contentPath;
    }

    public async download(url: string, destination: string) {
        return await axios({
            url,
            method: "get",
            responseType: "blob",
            onDownloadProgress: (progress) => {
                this.onProgress.dispatch({
                    currentBytes: progress.loaded,
                    totalBytes: progress.total
                });
            }
        });
    }

    public async downloadLatestEngine(includePrerelease = true) {
        // if and when the engine releases switches to not marking every release as prerelease then we should use the getLatestRelease octokit method

        const releasesResponse = await this.ocotokit.rest.repos.listReleases({
            owner: "beyond-all-reason",
            repo: "spring",
            per_page: 1
        });

        const latestEngineRelease = releasesResponse.data[0];
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
                this.onProgress.dispatch({
                    currentBytes: progress.loaded,
                    totalBytes: progress.total
                });
            }
        });

        const engine7z = downloadResponse.data as ArrayBuffer;

        const downloadPath = path.join(this.contentPath, "engine");
        const downloadFile = path.join(downloadPath, asset.name);

        await fs.promises.mkdir(downloadPath, { recursive: true });
        await fs.promises.writeFile(downloadFile, Buffer.from(engine7z), { encoding: "binary" });

        const dirName = latestEngineRelease.tag_name?.split("}")?.[1] + " bar";

        await extract7z(downloadFile, dirName);
    }

    public async downloadEngine(engineId: string) {
        // TODO
    }
}