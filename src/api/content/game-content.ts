import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import axios from "axios";
import { Octokit } from "octokit";
import { spawn } from "child_process";
import { BufferStream, lastInArray, removeFromArray } from "jaz-ts-utils";
import type { Message, ProgressMessage, RapidVersion } from "@/model/pr-downloader";
import { DownloadType } from "@/model/pr-downloader";
import { AbstractContentAPI } from "@/api/content/abstract-content";
import { contentSources } from "@/config/content-sources";
import { GameVersion, GameVersionFormat, parseGameVersionString } from "@/model/formats";
import { reactive } from "vue";
import type { DownloadInfo } from "@/model/downloads";
import { SdpEntry } from "@/model/sdp";

export class GameContentAPI extends AbstractContentAPI {
    public installedVersions: RapidVersion[] = reactive([]);

    protected prBinaryPath!: string;
    protected ocotokit = new Octokit();
    protected md5ToRapidVersionMap: Record<string, RapidVersion> = {};

    constructor(userDataDir: string, dataDir: string) {
        super(userDataDir, dataDir);
    }

    public async init(prBinaryPath: string) {
        this.prBinaryPath = prBinaryPath;

        await this.updateVersionMap();

        const packagesDir = path.join(this.dataDir, "packages");
        if (fs.existsSync(packagesDir)) {
            const sdpFilePaths = await fs.promises.readdir(packagesDir);
            for (const sdpFilePath of sdpFilePaths) {
                const md5 = sdpFilePath.split(".")[0];
                if (this.md5ToRapidVersionMap[md5]) {
                    this.installedVersions.push(this.md5ToRapidVersionMap[md5]);
                }
            }
            this.installedVersions.sort((a, b) => {
                return a.version.revision - b.version.revision;
            });
        }

        return this;
    }

    public async updateGame() {
        this.updateVersionMap();

        if (this.installedVersions.includes(lastInArray(this.installedVersions))) {
            console.log("Game is already up to date");
            return;
        }

        return new Promise<void>(resolve => {
            const prDownloaderProcess = spawn(`${this.prBinaryPath}`, [
                "--filesystem-writepath", this.dataDir,
                "--download-game", `${contentSources.rapid.game}:${contentSources.rapid.tag}`
            ]);

            let downloadType: DownloadType = DownloadType.Metadata;
            let download: DownloadInfo | undefined;

            prDownloaderProcess.stdout.on("data", (stdout: Buffer) => {
                const lines = stdout.toString().trim().split("\r\n").filter(Boolean);
                console.log(lines.join("\n"));
                const messages = lines.map(line => this.processPrDownloaderLine(line)).filter(Boolean) as Message[];
                for (const message of messages) {
                    if (this.isPrDownloaderProgressMessage(message) && downloadType === DownloadType.Game && download) {
                        message.downloadType = downloadType;
                        download.currentBytes = message.currentBytes;
                        download.totalBytes = message.totalBytes;
                    } else if (message.parts?.[1]?.includes("downloadStream")) {
                        downloadType = DownloadType.Game;
                    } else if (message.parts?.[1]?.includes("download_name")) {
                        download = reactive({
                            type: "game",
                            name: message.parts.slice(2).join(" "),
                            currentBytes: 0,
                            totalBytes: 1
                        } as const);
                        this.currentDownloads.push(download);
                    }
                }
            });

            prDownloaderProcess.stderr.on("data", (data: Buffer) => {
                console.error(data.toString());
            });

            prDownloaderProcess.on("close", () => {
                removeFromArray(this.currentDownloads, download);
                resolve();
            });
        });
    }

    public async updateVersionMap() {
        const response = await axios({
            url: `${contentSources.rapid.host}/${contentSources.rapid.game}/versions.gz`,
            method: "GET",
            responseType: "arraybuffer",
            headers: {
                "Content-Type": "application/gzip"
            }
        });

        const versionsStr = zlib.gunzipSync(response.data).toString().trim();
        const versionsParts = versionsStr.split("\n");
        versionsParts.map(versionLine => {
            const [ tag, md5, _, version ] = versionLine.split(",");
            this.md5ToRapidVersionMap[md5] = { tag, md5, version: parseGameVersionString(version) };
        });
    }

    public async getGameFiles(version: RapidVersion | GameVersion | GameVersionFormat, fileGlobs: string[]) : Promise<Record<string, string>> {
        let md5: string | undefined;
        if (typeof version === "object") {
            if ("md5" in version) {
                md5 = version.md5;
            } else {
                md5 = this.installedVersions.find(installedVersion => installedVersion.version.fullString === version.fullString)?.md5;
            }
        } else {
            md5 = this.installedVersions.find(installedVersion => installedVersion.version.fullString === version)?.md5;
        }

        if (!md5) {
            throw new Error(`Version ${version} is not installed`);
        }

        const sdpFilePath = path.join(this.dataDir, "packages", `${md5}.sdp`);
        const sdpEntries = await this.parseSdpFile(sdpFilePath, fileGlobs);

        const gameFiles: Record<string, string> = {};

        for (const sdpEntry of sdpEntries) {
            const poolDir = sdpEntry.md5.slice(0, 2);
            const dataFileName = `${sdpEntry.md5.slice(2)}.gz`;
            const dataFilePath = path.join(this.dataDir, "pool", poolDir, dataFileName);
            const dataFile = await fs.promises.readFile(dataFilePath);
            gameFiles[sdpEntry.fileName] = dataFile.toString();
        }

        return gameFiles;
    }

    protected async parseSdpFile(sdpFilePath: string, fileFilter?: string[]) : Promise<SdpEntry[]> {
        const sdpFileZipped = await fs.promises.readFile(sdpFilePath);
        const sdpFile = zlib.gunzipSync(sdpFileZipped);

        const bufferStream = new BufferStream(sdpFile, true);

        const fileData: SdpEntry[] = [];

        while (bufferStream.readStream.readableLength > 0 && fileFilter?.length !== fileData.length) {
            const fileNameLength = bufferStream.readInt(1);
            const fileName = bufferStream.readString(fileNameLength);
            const md5 = bufferStream.read(16).toString("hex");
            const crc32 = bufferStream.read(4).toString("hex");
            const filesizeBytes = bufferStream.readInt(4, true);

            if (fileFilter?.includes(fileName)) {
                fileData.push({ fileName, md5, crc32, filesizeBytes });
            } else if (!fileFilter) {
                fileData.push({ fileName, md5, crc32, filesizeBytes });
            }
        }

        return fileData;
    }

    protected processPrDownloaderLine(line: string) : Message | null {
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

    protected isPrDownloaderProgressMessage(message: Message) : message is ProgressMessage {
        return message.type === "Progress";
    }
}