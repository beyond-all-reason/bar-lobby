
// ./pr-downloader/pr-downloader.exe --filesystem-writepath "C:/Users/jaspe/AppData/Roaming/bar-lobby/content" --download-game byar:test

/**
 * TODO
 * - Add new cli arg to pr-downloader to skip downloading repos.springrts.com metadata for games other than the one specified
 */

import * as zlib from "zlib";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import axios from "axios";
import { Signal } from "jaz-ts-utils";
import { DownloadType, Message, ProgressMessage } from "../model/pr-downloader";

export class PRDownloaderAPI {
    public onProgress: Signal<ProgressMessage> = new Signal();
    public onMessage: Signal<Message> = new Signal();
    public onDone = new Signal();

    protected binaryPath: string;
    protected contentPath: string;
    protected gameName = "byar:test";

    constructor(contentPath: string) {
        if (process.platform === "win32") {
            this.binaryPath = "extra_resources/pr-downloader.exe";
        } else {
            this.binaryPath = "extra_resources/pr-downloader";
        }

        this.contentPath = contentPath;
    }

    public updateGame() {
        return new Promise<void>((resolve, reject) => {
            const prDownloaderProcess = spawn(`${this.binaryPath}`, [
                "--filesystem-writepath", this.contentPath,
                "--download-game", this.gameName
            ]);

            let downloadType: DownloadType = DownloadType.Metadata;

            prDownloaderProcess.stdout.on("data", (stdout: Buffer) => {
                console.log(stdout.toString());
                const lines = stdout.toString().trim().split("\r\n").filter(Boolean);
                const messages = lines.map(line => this.processLine(line)).filter(Boolean) as Message[];
                for (const message of messages) {
                    if (this.isProgressMessage(message) && downloadType === DownloadType.Game) {
                        message.downloadType = downloadType;
                        this.onProgress.dispatch(message);
                    } else {
                        if (message.parts?.[1]?.includes("downloadStream")) {
                            downloadType = DownloadType.Game;
                        }
                        this.onMessage.dispatch(message);
                    }
                }
            });

            prDownloaderProcess.stderr.on("data", (data: Buffer) => {
                console.error(data.toString());
                reject();
                prDownloaderProcess.kill();
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
                "--filesystem-writepath", this.contentPath,
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
        const [ tag, md5, something, version ] = latestVersion;

        return { tag, md5, version };
    }

    public isVersionInstalled(md5: string) {
        const sdpPath = path.join(this.contentPath, "packages", `${md5}.sdp`);

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
}