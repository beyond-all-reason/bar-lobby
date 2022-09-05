import axios from "axios";
import { spawn } from "child_process";
import * as fs from "fs";
import * as glob from "glob-promise";
import { BufferStream, lastInArray, removeFromArray } from "jaz-ts-utils";
import { Octokit } from "octokit";
import os from "os";
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

/**
 * This API utilises pr-downloader to download game files, therefore it requires at least one engine version to be installed and for api.content.engine to be initialised
 * prd is quite a dated tool at this point, and is lacking a lot of desired functionality that
 * would simplify this wrapper a lot
 *
 * https://github.com/beyond-all-reason/pr-downloader
 * https://springrts.com/wiki/Pr-downloader
 * https://springrts.com/wiki/Rapid
 *
 * @todo installedVersions is primitive and prone to bugs, as it only checks the packages folder and matches each sdp file
 * against the version listed in versions.gz. We don't verify if an sdp installation is incomplete or corrupted, so bugs may arise
 * when reporting a game version as installed when it's not really. Ideally needs solving within prd
 * @todo don't allow spawning multiple prd instances at once
 */
export class GameContentAPI extends AbstractContentAPI {
    /** Latest version is last item */
    public installedVersions: string[] = reactive([]);

    protected prBinaryPath!: string;
    protected ocotokit = new Octokit();
    protected md5ToRapidVersionMap: Record<string, RapidVersion> = {};

    public async init() {
        const engine = lastInArray(api.content.engine.installedVersions)!;
        const binaryName = process.platform === "win32" ? "pr-downloader.exe" : "pr-downloader";
        this.prBinaryPath = path.join(api.info.contentPath, "engine", engine, binaryName);

        await this.updateVersions();

        return this;
    }

    /**
     * Downloads the actual game files, will update to latest if no specific gameVersion is specified
     * @param gameVersion e.g. "Beyond All Reason test-16289-b154c3d"
     */
    public async downloadGame(gameVersion = `${contentSources.rapid.game}:test`) {
        return new Promise<void>((resolve) => {
            const prDownloaderProcess = spawn(`${this.prBinaryPath}`, ["--filesystem-writepath", api.info.contentPath, "--download-game", gameVersion]);

            console.debug(prDownloaderProcess.spawnargs);

            let downloadType: DownloadType = DownloadType.Metadata;
            let downloadInfo: DownloadInfo | undefined;

            prDownloaderProcess.stdout.on("data", (stdout: Buffer) => {
                const lines = stdout.toString().trim().split(os.EOL).filter(Boolean);
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
                        this.onDownloadStart.dispatch(downloadInfo);
                    }
                }
            });

            prDownloaderProcess.stderr.on("data", (data: Buffer) => {
                console.error(data.toString());
            });

            prDownloaderProcess.on("close", async () => {
                if (downloadInfo) {
                    if (!this.installedVersions.includes(downloadInfo.name)) {
                        this.installedVersions.push(downloadInfo.name);
                        this.sortVersions();
                    }
                    removeFromArray(this.currentDownloads, downloadInfo);
                    this.onDownloadComplete.dispatch(downloadInfo);
                }
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

        const md5ToVersionLookup: Record<string, string> = {};

        const versionsStr = zlib.gunzipSync(response.data).toString().trim();
        const versionsParts = versionsStr.split("\n");
        versionsParts.map((versionLine) => {
            const [tag, md5, _, version] = versionLine.split(",");
            md5ToVersionLookup[md5] = version;
        });

        const packagesDir = path.join(api.info.contentPath, "packages");
        if (fs.existsSync(packagesDir)) {
            const sdpFilePaths = await fs.promises.readdir(packagesDir);
            for (const sdpPath of sdpFilePaths) {
                const sdpMd5 = path.parse(sdpPath).name;
                const version = md5ToVersionLookup[sdpMd5];
                if (!this.installedVersions.includes(version)) {
                    this.installedVersions.push(version);
                }
            }

            this.sortVersions();
        }
    }

    /**
     * @todo need to lookup sdp file for specified game
     * @param filePatterns glob pattern for which files to retrieve
     * @example getGameFiles("Beyond All Reason test-16289-b154c3d", ["units/CorAircraft/T2/*.lua"])
     */
    public async getGameFiles(version: string, filePattern: string): Promise<SdpFile[]> {
        if (!this.installedVersions.includes(version)) {
            throw new Error(`Cannot fetch files for ${version}, as it is not installed`);
        }

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

    protected async parseSdpFile(sdpFilePath: string, filePattern?: string): Promise<SdpFileMeta[]> {
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

    protected sortVersions() {
        this.installedVersions.sort((a, b) => {
            const aRev = parseInt(a.split("-")[1]);
            const bRev = parseInt(b.split("-")[1]);
            return aRev - bRev;
        });
    }
}
