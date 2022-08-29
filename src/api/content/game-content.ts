import axios from "axios";
import { spawn } from "child_process";
import * as fs from "fs";
import * as glob from "glob-promise";
import { BufferStream, removeFromArray } from "jaz-ts-utils";
import { Octokit } from "octokit";
import * as path from "path";
import { reactive } from "vue";
import * as zlib from "zlib";

import { AbstractContentAPI } from "@/api/content/abstract-content-api";
import { contentSources } from "@/config/content-sources";
import type { DownloadInfo } from "@/model/downloads";
import { LuaOptionSection } from "@/model/lua-options";
import type { Message, ProgressMessage, RapidVersion } from "@/model/pr-downloader";
import { DownloadType } from "@/model/pr-downloader";
import { SdpFile, SdpFileMeta } from "@/model/sdp";
import { parseLuaOptions } from "@/utils/parse-lua-options";

export class GameContentAPI extends AbstractContentAPI {
    public readonly installedVersions: RapidVersion[] = reactive([]);

    protected prBinaryPath!: string;
    protected ocotokit = new Octokit();
    protected md5ToRapidVersionMap: Record<string, RapidVersion> = {};

    public async init(prBinaryPath: string) {
        this.prBinaryPath = prBinaryPath;

        await this.updateVersions();

        return this;
    }

    public async updateGame() {
        await this.updateVersions();

        return new Promise<void>((resolve) => {
            const prDownloaderProcess = spawn(`${this.prBinaryPath}`, ["--filesystem-writepath", api.info.contentPath, "--download-game", `${contentSources.rapid.game}:${contentSources.rapid.tag}`]);

            let downloadType: DownloadType = DownloadType.Metadata;
            let downloadInfo: DownloadInfo | undefined;

            prDownloaderProcess.stdout.on("data", (stdout: Buffer) => {
                const lines = stdout.toString().trim().split("\r\n").filter(Boolean);
                console.debug(lines.join("\n"));
                const messages = lines.map((line) => this.processPrDownloaderLine(line)).filter(Boolean) as Message[];
                for (const message of messages) {
                    if (this.isPrDownloaderProgressMessage(message) && downloadType === DownloadType.Game && downloadInfo) {
                        message.downloadType = downloadType;
                        downloadInfo.currentBytes = message.currentBytes;
                        downloadInfo.totalBytes = message.totalBytes;
                    } else if (message.parts?.[1]?.includes("downloadStream")) {
                        downloadType = DownloadType.Game;
                    } else if (message.parts?.[1]?.includes("download_name")) {
                        downloadInfo = reactive({
                            type: "game",
                            name: message.parts.slice(2).join(" "),
                            currentBytes: 0,
                            totalBytes: 1,
                        } as const);
                        this.currentDownloads.push(downloadInfo);
                    }
                }
            });

            prDownloaderProcess.stderr.on("data", (data: Buffer) => {
                console.error(data.toString());
            });

            prDownloaderProcess.on("close", async () => {
                removeFromArray(this.currentDownloads, downloadInfo);
                this.onDownloadComplete.dispatch(downloadInfo);
                await this.updateVersions();
                resolve();
            });
        });
    }

    public async updateVersions() {
        const response = await axios({
            url: `${contentSources.rapid.host}/${contentSources.rapid.game}/versions.gz`,
            method: "GET",
            responseType: "arraybuffer",
            headers: {
                "Content-Type": "application/gzip",
            },
        });

        const versionsStr = zlib.gunzipSync(response.data).toString().trim();
        const versionsParts = versionsStr.split("\n");
        versionsParts.map((versionLine) => {
            const [tag, md5, _, version] = versionLine.split(",");
            this.md5ToRapidVersionMap[md5] = { tag, md5, version };
        });

        const packagesDir = path.join(api.info.contentPath, "packages");
        if (fs.existsSync(packagesDir)) {
            const sdpFilePaths = await fs.promises.readdir(packagesDir);
            for (const sdpFilePath of sdpFilePaths) {
                const md5 = sdpFilePath.split(".")[0];
                if (this.md5ToRapidVersionMap[md5] && !this.installedVersions.find((version) => version.md5 === md5)) {
                    this.installedVersions.push(this.md5ToRapidVersionMap[md5]);
                }
            }
            this.installedVersions.sort((a, b) => {
                // TODO
                return 0;
            });
        }
    }

    /**
     * @param filePatterns glob pattern for which files to retrieve
     * @example getGameFiles("Beyond All Reason test-16289-b154c3d", ["units/CorAircraft/T2/*.lua"])
     */
    public async getGameFiles(version: string, filePattern: string): Promise<SdpFile[]> {
        const sdpEntries = await this.parseSdpFile(version, filePattern);

        const sdpFiles: SdpFile[] = [];

        for (const sdpEntry of sdpEntries) {
            const poolDir = sdpEntry.md5.slice(0, 2);
            const archiveFileName = `${sdpEntry.md5.slice(2)}.gz`;
            const archiveFilePath = path.join(api.info.contentPath, "pool", poolDir, archiveFileName);
            const archiveFile = await fs.promises.readFile(archiveFilePath);
            const data = zlib.gunzipSync(archiveFile);

            const sdpFile: SdpFile = { ...sdpEntry, data };
            sdpFiles.push(sdpFile);
        }

        return sdpFiles;
    }

    public async getGameOptions(version: string): Promise<LuaOptionSection[]> {
        // TODO: cache per session
        const gameFiles = await this.getGameFiles(version, "modoptions.lua");
        const gameOptionsLua = gameFiles[0].data;
        return parseLuaOptions(gameOptionsLua);
    }

    protected async parseSdpFile(version: string, filePattern?: string): Promise<SdpFileMeta[]> {
        const md5 = this.installedVersions.find((installedVersion) => installedVersion.version === version)?.md5;
        if (!md5) {
            throw new Error(`Version ${version} is not installed`);
        }

        const sdpFilePath = path.join(api.info.contentPath, "packages", `${md5}.sdp`);
        const sdpFileZipped = await fs.promises.readFile(sdpFilePath);
        const sdpFile = zlib.gunzipSync(sdpFileZipped);

        const bufferStream = new BufferStream(sdpFile, true);

        const fileData: SdpFileMeta[] = [];

        let globPattern: InstanceType<typeof glob.Glob> | undefined;
        if (filePattern) {
            globPattern = new glob.Glob(filePattern);
        }

        while (bufferStream.readStream.readableLength > 0) {
            const fileNameLength = bufferStream.readInt(1);
            const fileName = bufferStream.readString(fileNameLength);
            const md5 = bufferStream.read(16).toString("hex");
            const crc32 = bufferStream.read(4).toString("hex");
            const filesizeBytes = bufferStream.readInt(4, true);
            const archivePath = path.join(api.info.contentPath, "pool", md5.slice(0, 2), `${md5.slice(2)}.gz`);

            if (globPattern && globPattern.minimatch.match(fileName)) {
                fileData.push({ fileName, md5, crc32, filesizeBytes, archivePath });
            } else if (!globPattern) {
                fileData.push({ fileName, md5, crc32, filesizeBytes, archivePath });
            }
        }

        return fileData;
    }

    protected processPrDownloaderLine(line: string): Message | null {
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

    protected isPrDownloaderProgressMessage(message: Message): message is ProgressMessage {
        return message.type === "Progress";
    }
}
