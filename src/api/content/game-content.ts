import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import axios from "axios";
import { Signal } from "jaz-ts-utils";
import { Octokit } from "octokit";
import { spawn } from "child_process";
import { DownloadType, Message, ProgressMessage, RapidVersion } from "@/model/pr-downloader";
import { AbstractContentAPI } from "@/api/content/abstract-content";
import { contentSources } from "@/config/content-sources";
import { EngineTagFormat } from "@/model/formats";

export class GameContentAPI extends AbstractContentAPI {
    public onDlProress: Signal<ProgressMessage> = new Signal();
    public onDlDone = new Signal();

    protected prBinaryPath?: string;
    protected ocotokit = new Octokit();

    constructor(userDataDir: string, dataDir: string) {
        super(userDataDir, dataDir);
    }

    public async init(latestEngine: EngineTagFormat) {
        const binaryName = process.platform === "win32" ? "pr-downloader.exe" : "pr-downloader";
        this.prBinaryPath = path.join(this.dataDir, "engine", latestEngine, binaryName);

        return this;
    }

    public updateGame() {
        return new Promise<void>(resolve => {
            const prDownloaderProcess = spawn(`${this.prBinaryPath}`, [
                "--filesystem-writepath", this.dataDir,
                "--download-game", `${contentSources.rapid.game}:${contentSources.rapid.tag}`
            ]);

            let downloadType: DownloadType = DownloadType.Metadata;

            prDownloaderProcess.stdout.on("data", (stdout: Buffer) => {
                const lines = stdout.toString().trim().split("\r\n").filter(Boolean);
                console.log(lines.join("\n"));
                const messages = lines.map(line => this.processLine(line)).filter(Boolean) as Message[];
                for (const message of messages) {
                    if (this.isProgressMessage(message) && downloadType === DownloadType.Game) {
                        message.downloadType = downloadType;
                        this.onDlProress.dispatch(message);
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
                this.onDlDone.dispatch();
                resolve();
            });
        });
    }

    public async isLatestGameVersionInstalled() {
        const latestVersion = await this.getLatestGameVersionInfo();
        return this.isVersionInstalled(latestVersion.md5);
    }

    public async getLatestGameVersionInfo() {
        const response = await axios({
            url: `${contentSources.rapid.host}/${contentSources.rapid.game}/versions.gz`,
            method: "GET",
            responseType: "arraybuffer",
            headers: {
                "Content-Type": "application/gzip"
            }
        });

        const versions = this.parseVersions(response.data);

        return versions[versions.length - 1];
    }

    public async getInstalledGameVersions() {
        // TODO
    }

    public isVersionInstalled(md5: string) {
        const sdpPath = path.join(this.dataDir, "packages", `${md5}.sdp`);

        return fs.existsSync(sdpPath);
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

    protected parseVersions(versionsGzipped: string) : RapidVersion[] {
        const versionsStr = zlib.gunzipSync(versionsGzipped).toString().trim();
        const versionsParts = versionsStr.split("\n");
        const versions: RapidVersion[] = versionsParts.map(versionLine => {
            const [ tag, md5, _, version ] = versionLine.split(",");
            return { tag, md5, version };
        });

        return versions;
    }
}