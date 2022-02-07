import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import axios from "axios";
import { Signal } from "jaz-ts-utils";
import { Octokit } from "octokit";
import { spawn } from "child_process";
import { MapParser } from "spring-map-parser";
import { DemoParser } from "sdfz-demo-parser";
import { DownloadType, Message, ProgressMessage } from "@/model/pr-downloader";
import { extract7z } from "@/utils/extract7z";
import { EngineTagFormat, isEngineTag } from "../model/formats";
import { Ref } from "vue";
import { MapData } from "@/model/map";

export class ContentAPI {
    public onEngineProgress: Signal<{ currentBytes: number; totalBytes: number }> = new Signal();
    public onGameProress: Signal<ProgressMessage> = new Signal();
    public onDone = new Signal();

    //protected mapCacheWorker: WorkerWrapper;
    protected ocotokit = new Octokit();
    protected binaryPath: string;
    protected gameName = "byar:test";
    protected mapParser = new MapParser();
    protected demoParser = new DemoParser();
    protected maps: Readonly<Record<string, MapData>> = {};

    constructor(protected userDataDir: string, protected dataDir: Ref<string>) {
        if (process.platform === "win32") {
            this.binaryPath = "resources/pr-downloader.exe";
        } else if (process.platform === "linux") {
            this.binaryPath = "resources/pr-downloader";
        } else {
            throw new Error("Unsupported platform");
        }

        window.api.workers.mapCache.on("item-cache-loaded").add((maps: Record<string, MapData>) => {
            this.maps = Object.freeze(maps);
        });

        window.api.workers.mapCache.on("item-cache-saved").add((maps: Record<string, MapData>) => {
            this.maps = Object.freeze(maps);
        });
    }

    public async init() {
        return this;
    }

    public async downloadLatestEngine(includePrerelease = true) {
        const latestEngineRelease = await this.getLatestEngineRelease();

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
                this.onEngineProgress.dispatch({
                    currentBytes: progress.loaded,
                    totalBytes: progress.total
                });
            }
        });

        const engine7z = downloadResponse.data as ArrayBuffer;

        const downloadPath = path.join(this.dataDir.value, "engine");
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

    public async getLatestEngineRelease() {
        // if and when the engine releases switches to not marking every release as prerelease then we should use the getLatestRelease octokit method
        const releasesResponse = await this.ocotokit.rest.repos.listReleases({
            owner: "beyond-all-reason",
            repo: "spring",
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
                owner: "beyond-all-reason",
                repo: "spring",
                tag: gitTag
            });

            return release;
        } catch (err) {
            console.error(err);
            throw new Error(`Couldn't get engine release for tag: ${engineTag}`);
        }
    }

    public async listInstalledEngineVersions() {
        const engineVersions: EngineTagFormat[] = [];

        const engineDir = path.join(this.dataDir.value, "engine");
        const engineDirs = await fs.promises.readdir(engineDir);

        for (const dir of engineDirs) {
            if (isEngineTag(dir)) {
                engineVersions.push(dir);
            }
        }

        return engineVersions;
    }

    // arg format should match dir name, e.g. BAR-105.1.1-809-g3f69f26
    public async isEngineVersionInstalled(engineTag: EngineTagFormat) {
        return fs.existsSync(path.join(this.dataDir.value, "engine", engineTag));
    }

    public async isLatestEngineVersionInstalled() {
        const latestEngineVersion = await this.getLatestEngineRelease();
        const engineTag = this.engineTagNameToVersionString(latestEngineVersion.tag_name);

        return this.isEngineVersionInstalled(engineTag);
    }

    public updateGame() {
        return new Promise<void>(resolve => {
            const prDownloaderProcess = spawn(`${this.binaryPath}`, [
                "--filesystem-writepath", this.dataDir.value,
                "--download-game", this.gameName
            ]);

            let downloadType: DownloadType = DownloadType.Metadata;

            prDownloaderProcess.stdout.on("data", (stdout: Buffer) => {
                const lines = stdout.toString().trim().split("\r\n").filter(Boolean);
                console.log(lines.join("\n"));
                const messages = lines.map(line => this.processLine(line)).filter(Boolean) as Message[];
                for (const message of messages) {
                    if (this.isProgressMessage(message) && downloadType === DownloadType.Game) {
                        message.downloadType = downloadType;
                        this.onGameProress.dispatch(message);
                    } else {
                        if (message.parts?.[1]?.includes("downloadStream")) {
                            downloadType = DownloadType.Game;
                        }
                    }
                }
            });

            prDownloaderProcess.stderr.on("data", (data: Buffer) => {
                console.error(data.toString());
            });

            prDownloaderProcess.on("close", () => {
                this.onDone.dispatch();
                resolve();
            });
        });
    }

    public isRapidInitialized() : Promise<boolean> {
        return new Promise(resolve => {
            const prDownloaderProcess = spawn(`${this.binaryPath}`, [
                "--filesystem-writepath", this.dataDir.value,
                "--rapid-validate"
            ]);

            prDownloaderProcess.stderr.on("data", (data: Buffer) => {
                resolve(false);
                prDownloaderProcess.removeAllListeners();
                prDownloaderProcess.kill();
            });

            prDownloaderProcess.on("close", () => {
                resolve(true);
            });
        });
    }

    public async isLatestGameVersionInstalled() {
        const latestVersion = await this.getLatestVersionInfo();
        return this.isVersionInstalled(latestVersion.md5);
    }

    public async getLatestVersionInfo() {
        const response = await axios({
            url: "https://repos.springrts.com/byar/versions.gz",
            method: "GET",
            responseType: "arraybuffer",
            headers: {
                "Content-Type": "application/gzip"
            }
        });

        const versionsStr = zlib.gunzipSync(response.data).toString().trim();
        const versionsParts = versionsStr.split("\n");
        const latestVersion = versionsParts.pop()!.split(",");
        const [ tag, md5, _, version ] = latestVersion;

        return { tag, md5, version };
    }

    public isVersionInstalled(md5: string) {
        const sdpPath = path.join(this.dataDir.value, "packages", `${md5}.sdp`);

        return fs.existsSync(sdpPath);
    }

    public getMaps() : { [filename: string]: MapData; } {
        return this.maps;
    }

    public getMapByFilename(filename: string) : MapData | undefined {
        return this.maps[filename];
    }

    public getMapImages(filename: string) {
        if (this.getMapByFilename(filename)) {
            const filenameWithoutExt = path.parse(filename).name;

            return {
                texture: path.join(this.getMapImagesPath(), `${filenameWithoutExt}-texture.jpg`).replaceAll("\\", "/"),
                height: path.join(this.getMapImagesPath(), `${filenameWithoutExt}-height.jpg`).replaceAll("\\", "/"),
                metal: path.join(this.getMapImagesPath(), `${filenameWithoutExt}-metal.jpg`).replaceAll("\\", "/"),
                type: path.join(this.getMapImagesPath(), `${filenameWithoutExt}-type.jpg`).replaceAll("\\", "/"),
            };
        }

        return;
    }

    public getMapsPath() {
        return path.join(this.dataDir.value, "maps").replaceAll("\\", "/");
    }

    public getMapImagesPath() {
        return path.join(this.dataDir.value, "map-images").replaceAll("\\", "/");
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

    protected processLine(line: string) : Message | null {
        if (!line) {
            return null;
        }

        const parts = line.split(" ").filter(Boolean);

        let type = parts[0];
        if (type[0] === "[") {
            type = type.slice(1, -1);
        }

        if (type === "Progress") {
            const parsedPercent = parseInt(parts[1]) / 100;
            const bytes = parts[parts.length - 1].split("/");
            const currentBytes = parseInt(bytes[0]);
            const totalBytes = parseInt(bytes[1]);
            if (!totalBytes || Number.isNaN(totalBytes)) {
                return null;
            }
            const message: Omit<ProgressMessage, "downloadType"> = { type, parts, currentBytes, totalBytes, parsedPercent };
            return message;
        }

        return { type, parts };
    }

    protected isProgressMessage(message: Message) : message is ProgressMessage {
        return message.type === "Progress";
    }
}