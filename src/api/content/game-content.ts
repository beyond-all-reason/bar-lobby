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
import { GameVersionFormat, parseGameVersionString } from "@/model/formats";
import { reactive } from "vue";
import type { DownloadInfo } from "@/model/downloads";
import { SdpFile, SdpFileMeta } from "@/model/sdp";
import * as glob from "glob-promise";
import { ModOption, ModOptionBoolean, ModOptionList, ModOptionNumber, ModOptionSection } from "@/model/mod-options";
import { parseLuaTable } from "@/utils/parse-lua-table";

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
            console.log(`Latest game version already installed: ${lastInArray(this.installedVersions).version.fullString}`);
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

    /**
     * @param filePatterns glob pattern for which files to retrieve
     * @example getGameFiles("Beyond All Reason test-16289-b154c3d", ["units/CorAircraft/T2/*.lua"])
    */
    public async getGameFiles(version: GameVersionFormat, filePattern: string) : Promise<SdpFile[]> {
        const sdpEntries = await this.parseSdpFile(version, filePattern);

        const sdpFiles: SdpFile[] = [];

        for (const sdpEntry of sdpEntries) {
            const poolDir = sdpEntry.md5.slice(0, 2);
            const archiveFileName = `${sdpEntry.md5.slice(2)}.gz`;
            const archiveFilePath = path.join(this.dataDir, "pool", poolDir, archiveFileName);
            const archiveFile = await fs.promises.readFile(archiveFilePath);
            const data = zlib.gunzipSync(archiveFile);

            const sdpFile: SdpFile = { ...sdpEntry, data };
            sdpFiles.push(sdpFile);
        }

        return sdpFiles;
    }

    public async getModOptions(version: GameVersionFormat) : Promise<ModOption[]> {
        const gameFiles = await this.getGameFiles(version, "modoptions.lua");
        const modOptionsLua = gameFiles[0].data;
        const modOptionsArray = parseLuaTable(modOptionsLua, "options") as Array<Record<string, any>>; // TODO: type this

        const sections: ModOptionSection[] = [];

        for (const modOptionObj of modOptionsArray) {
            const baseModOption: ModOption = {
                key: modOptionObj.key,
                name: modOptionObj.name,
                description: modOptionObj.desc,
                hidden: modOptionObj.hidden ?? false
            };

            if (modOptionObj.type === "section") {
                const section: ModOptionSection = {
                    ...baseModOption,
                    options: []
                };
                sections.push(section);
                continue;
            }

            const section = sections.find(section => section.key === modOptionObj.section);

            if (!section) {
                console.warn(`Could not find section ${modOptionObj.key} in modoptions.lua for ${version}`);
                continue;
            }

            if (modOptionObj.type === "number") {
                const modOption: ModOptionNumber = {
                    ...baseModOption,
                    default: modOptionObj.def,
                    step: modOptionObj.step,
                    min: modOptionObj.min,
                    max: modOptionObj.max
                };
                section?.options.push(modOption);
            } else if (modOptionObj.type === "boolean") {
                const modOption: ModOptionBoolean = {
                    ...baseModOption,
                    default: modOptionObj.def
                };
                section?.options.push(modOption);
            } else if (modOptionObj.type === "list") {
                const options: ModOption[] = [];
                for (const option of modOptionObj.items) {
                    options.push({
                        key: option.key,
                        name: option.name,
                        description: option.desc,
                        hidden: option.hidden
                    });
                }
                const modOption: ModOptionList = {
                    ...baseModOption,
                    default: modOptionObj.def,
                    options
                };
                section?.options.push(modOption);
            }
        }

        return sections;
    }

    protected async parseSdpFile(version: GameVersionFormat, filePattern?: string) : Promise<SdpFileMeta[]> {
        const md5 = this.installedVersions.find(installedVersion => installedVersion.version.fullString === version)?.md5;
        if (!md5) {
            throw new Error(`Version ${version} is not installed`);
        }

        const sdpFilePath = path.join(this.dataDir, "packages", `${md5}.sdp`);
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
            const archivePath = path.join(this.dataDir, "pool", md5.slice(0, 2), `${md5.slice(2)}.gz`);

            if (globPattern && globPattern.minimatch.match(fileName)) {
                fileData.push({ fileName, md5, crc32, filesizeBytes, archivePath });
            } else if (!globPattern) {
                fileData.push({ fileName, md5, crc32, filesizeBytes, archivePath });
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