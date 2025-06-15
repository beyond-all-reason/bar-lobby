// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { spawn } from "child_process";
import os from "os";
import path from "path";

import { DownloadInfo } from "./downloads";
import { AbstractContentAPI } from "./abstract-content";
import { engineContentAPI } from "./engine/engine-content";
import { logger } from "@main/utils/logger";
import { ASSETS_PATH, ENGINE_PATH } from "@main/config/app";

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
        return new Promise<DownloadInfo>((resolve, reject) => {
            try {
                log.debug(`Downloading ${name}...`);

                const defaultEngine = engineContentAPI.getDefaultEngine();

                // These two errors should in theory never happen...
                if (!defaultEngine) throw new Error("No default engine version.");
                if (defaultEngine.installed === false) throw new Error("Default engine is not installed.");

                const binaryName = process.platform === "win32" ? "pr-downloader.exe" : "pr-downloader";
                const prBinaryPath = path.join(ENGINE_PATH, defaultEngine.id, binaryName);
                const downloadArg = type === "game" ? "--download-game" : "--download-map";
                const prdProcess = spawn(`${prBinaryPath}`, ["--filesystem-writepath", ASSETS_PATH, downloadArg, name], {
                    env: {
                        ...process.env,
                        PRD_RAPID_USE_STREAMER: "false",
                        PRD_RAPID_REPO_MASTER: "https://repos-cdn.beyondallreason.dev/repos.gz",
                        PRD_HTTP_SEARCH_URL: "https://files-cdn.beyondallreason.dev/find",
                    },
                });
                const downloadInfo: DownloadInfo = {
                    type,
                    name,
                    currentBytes: 0,
                    totalBytes: 0,
                    progress: 0,
                };
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
                                if (downloadInfo.totalBytes === 0) {
                                    downloadInfo.totalBytes = progress.totalBytes;
                                    downloadInfo.progress = 0;
                                    this.currentDownloads.push(downloadInfo);
                                    this.downloadStarted(downloadInfo);
                                } else {
                                    downloadInfo.currentBytes = progress.currentBytes;
                                    downloadInfo.totalBytes = progress.totalBytes;
                                    downloadInfo.progress = progress.parsedPercent;
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
                    reject(err);
                });

                prdProcess.stderr?.on("data", (data: Buffer) => {
                    log.error(data.toString());
                });

                prdProcess.on("exit", (code, signal) => {
                    if (code !== 0) {
                        reject(new Error(`pr-downloader exited with code ${code}, signal ${signal}`));
                    } else {
                        resolve(downloadInfo);
                    }
                });
            } catch (err) {
                log.error(err);
                reject(err);
            }
        });
    }

    protected parseProgressMessage(message: string): Omit<PrdProgressMessage, "downloadType" | "content"> {
        const parts = message.split(" ");
        const bytes = parts[parts.length - 1].split("/");
        const currentBytes = parseInt(bytes[0]);
        const totalBytes = parseInt(bytes[1]);
        //The message contains a percentage, but due to the message.split() it is safer to calculate it ourselves since we have the bytes
        const parsedPercent = currentBytes / totalBytes || 0;
        return { currentBytes, totalBytes, parsedPercent };
    }
}
