import { spawn } from "child_process";
import os from "os";
import path from "path";

import { DownloadInfo } from "./downloads";
import { AbstractContentAPI } from "./abstract-content";
import { engineContentAPI } from "./engine/engine-content";
import { logger } from "@main/utils/logger";
import { CONTENT_PATH } from "@main/config/app";

const log = logger("pr-downloader.ts");

export type PrdDownloadType = "engine" | "game" | "map";

export type PrdProgressMessage = {
    downloadType: PrdDownloadType;
    content: string;
    currentBytes: number;
    totalBytes: number;
    parsedPercent: number;
};

export type RapidVersion = {
    tag: string;
    md5: string;
    version: string;
};

/**
 * https://github.com/beyond-all-reason/pr-downloader
 * https://springrts.com/wiki/Pr-downloader
 * https://springrts.com/wiki/Rapid
 */
export abstract class PrDownloaderAPI<ID, T> extends AbstractContentAPI<ID, T> {
    protected downloadContent(type: "game" | "map", name: string) {
        return new Promise<DownloadInfo>((resolve) => {
            log.debug(`Downloading ${name}...`);
            const latestEngine = engineContentAPI.getLatestInstalledVersion().id;
            if (!latestEngine) throw new Error("No engine version found");

            const binaryName = process.platform === "win32" ? "pr-downloader.exe" : "pr-downloader";
            const prBinaryPath = path.join(CONTENT_PATH, "engine", latestEngine, binaryName);
            const downloadArg = type === "game" ? "--download-game" : "--download-map";
            const prdProcess = spawn(`${prBinaryPath}`, ["--filesystem-writepath", CONTENT_PATH, downloadArg, name], {
                env: {
                    ...process.env,
                    PRD_RAPID_USE_STREAMER: "false",
                    PRD_RAPID_REPO_MASTER: "https://repos-cdn.beyondallreason.dev/repos.gz",
                    PRD_HTTP_SEARCH_URL: "https://files-cdn.beyondallreason.dev/find",
                },
            });

            let downloadInfo: DownloadInfo | undefined;
            prdProcess.stdout?.on("data", (stdout: Buffer) => {
                const messages = stdout.toString().trim().split(os.EOL).filter(Boolean);
                for (const message of messages) {
                    log.debug(message);
                    if (message.startsWith("[Progress]")) {
                        const progressData = this.parseProgressMessage(message);
                        const progress: PrdProgressMessage = {
                            downloadType: type,
                            content: name,
                            ...progressData,
                        };
                        if (progress.totalBytes > 1) {
                            if (!downloadInfo) {
                                downloadInfo = {
                                    type,
                                    name,
                                    currentBytes: 0,
                                    totalBytes: progress.totalBytes,
                                };
                                this.currentDownloads.push(downloadInfo);
                                this.downloadStarted(downloadInfo);
                            } else {
                                downloadInfo.currentBytes = progress.currentBytes;
                                downloadInfo.totalBytes = progress.totalBytes;
                                this.downloadProgress(downloadInfo);
                            }
                        }
                    } else if (message.includes("download_name():[Download] ") && downloadInfo) {
                        downloadInfo.name = message.split("download_name():[Download] ")[1];
                    }
                }
            });

            prdProcess.on("error", (err) => {
                log.error(err);
            });

            prdProcess.stderr?.on("data", (data: Buffer) => {
                log.error(data.toString());
            });

            prdProcess.on("exit", () => {
                resolve(downloadInfo);
            });
        });
    }

    protected parseProgressMessage(message: string): Omit<PrdProgressMessage, "downloadType" | "content"> {
        const parts = message.split(" ");
        const parsedPercent = parseInt(parts[1]) / 100;
        const bytes = parts[parts.length - 1].split("/");
        const currentBytes = parseInt(bytes[0]);
        const totalBytes = parseInt(bytes[1]);
        return { currentBytes, totalBytes, parsedPercent };
    }
}
