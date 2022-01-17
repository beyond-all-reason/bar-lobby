
// ./pr-downloader/pr-downloader.exe --filesystem-writepath "C:/Users/jaspe/AppData/Roaming/bar-lobby/content" --download-game byar:test

/**
 * TODO
 * - Add new cli arg to pr-downloader to skip downloading repos.springrts.com metadata for games other than the one specified
 */

import { DownloadType, Message, ProgressMessage } from "../model/pr-downloader";
import { spawn } from "child_process";
import { Signal } from "jaz-ts-utils";

export class PRDownloaderAPI {
    public onProgress: Signal<ProgressMessage> = new Signal();
    public onMessage: Signal<Message> = new Signal();
    public onAnything = new Signal();
    public onDone = new Signal();

    protected binaryPath: string;
    protected contentPath: string;
    protected gameName = "byar:test";

    constructor(contentPath: string) {
        if (process.platform === "darwin") {
            this.binaryPath = "pr-downloader/pr-downloader-mac";
        } else if (process.platform === "win32") {
            this.binaryPath = "pr-downloader/pr-downloader.exe";
        } else {
            this.binaryPath = "pr-downloader/pr-downloader";
        }

        this.contentPath = contentPath;
    }

    public downloadGame() {
        return new Promise<void>((resolve, reject) => {
            const prDownloaderProcess = spawn(`${this.binaryPath}`, [
                "--filesystem-writepath", this.contentPath,
                "--download-game", this.gameName
            ]);

            let downloadType: DownloadType = DownloadType.Metadata;

            prDownloaderProcess.stdout.on("data", (stdout: Buffer) => {
                this.onAnything.dispatch(stdout.toString());
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