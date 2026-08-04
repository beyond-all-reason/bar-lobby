// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { execFile, spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

import { DownloadInfo } from "./downloads";
import { AbstractContentAPI } from "./abstract-content";
import { engineProvider } from "./engine/engine-provider";
import { logger } from "@main/utils/logger";
import { getAssetsPath, getEnginePath, getCaCertPath, getPackagePath } from "@main/config/app";
import { holdChecksums } from "@main/utils/checksums";

const log = logger("pr-downloader.ts");

export type PrdDownloadType = "game" | "map";

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

// pr-downloader ships inside the engine, so any installed engine can drive downloads. Preferring the
// default and then newest-first keeps content downloadable after a default version bump, when the new
// default is not installed yet, and skips engines whose install did not produce a binary.
export function findPrdBinary() {
    const binaryName = process.platform === "win32" ? "pr-downloader.exe" : "pr-downloader";
    const defaultEngine = engineProvider.getDefaultEngine();
    const candidates = [...(defaultEngine?.installed ? [defaultEngine] : []), ...engineProvider.getInstalledVersionsNewestFirst()];

    for (const engine of candidates) {
        const binaryPath = path.join(getEnginePath(), engine.id, binaryName);
        if (fs.existsSync(binaryPath)) {
            return binaryPath;
        }
        log.warn(`Engine ${engine.id} has no ${binaryName}, trying the next one`);
    }

    return undefined;
}

/**
 * https://github.com/beyond-all-reason/pr-downloader
 * https://springrts.com/wiki/Pr-downloader
 * https://springrts.com/wiki/Rapid
 */
export abstract class PrDownloaderAPI<ID, T> extends AbstractContentAPI<ID, T> {
    protected getPrdBinaryPath() {
        const binaryPath = findPrdBinary();
        if (!binaryPath) {
            throw new Error("No installed engine ships a pr-downloader binary.");
        }

        return binaryPath;
    }

    protected downloadContent(type: "game" | "map", name: string) {
        return new Promise<DownloadInfo>((resolve, reject) => {
            try {
                log.debug(`Downloading ${name}...`);

                const prBinaryPath = this.getPrdBinaryPath();
                const downloadArg = type === "game" ? "--download-game" : "--download-map";
                const caCertPath = getCaCertPath();
                const prdProcess = spawn(`${prBinaryPath}`, ["--filesystem-writepath", getAssetsPath(), downloadArg, name], {
                    env: {
                        ...process.env,
                        PRD_RAPID_USE_STREAMER: "false",
                        PRD_RAPID_REPO_MASTER: "https://repos-cdn.beyondallreason.dev/repos.gz",
                        PRD_HTTP_SEARCH_URL: "https://files-cdn.beyondallreason.dev/find",
                        ...(caCertPath && !process.env.PRD_SSL_CERT_FILE && { PRD_SSL_CERT_FILE: caCertPath }),
                    },
                });
                const downloadInfo: DownloadInfo = {
                    type,
                    id: name,
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
                                    downloadInfo.currentBytes = progress.currentBytes;
                                    downloadInfo.progress = progress.parsedPercent;
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
                    this.downloadFailed(downloadInfo);
                    reject(err);
                });

                prdProcess.stderr?.on("data", (data: Buffer) => {
                    const output = data.toString();
                    log.error(output);
                    if (output.includes("will retry")) {
                        this.downloadRetrying(downloadInfo);
                    }
                });

                prdProcess.on("exit", (code, signal) => {
                    if (code !== 0) {
                        this.downloadFailed(downloadInfo);
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

    // --uninstall is newer than several engine releases and the binary travels with the engine rather
    // than with this app, so ask the resolved binary instead of guessing from a version number.
    private static readonly uninstallSupport = new Map<string, Promise<boolean>>();

    private static supportsUninstall(binaryPath: string) {
        let probe = PrDownloaderAPI.uninstallSupport.get(binaryPath);

        if (!probe) {
            probe = new Promise<boolean>((resolve) => {
                execFile(binaryPath, ["--help"], (err, stdout) => resolve(!err && stdout.includes("--uninstall")));
            });
            PrDownloaderAPI.uninstallSupport.set(binaryPath, probe);
        }

        return probe;
    }

    // Resolution happens against the local install, so an md5 is the only name that cannot come back
    // ambiguous or go missing once a rapid tag stops being published.
    protected async uninstallContent(packageMd5: string) {
        const binaryPath = this.getPrdBinaryPath();

        if (!(await PrDownloaderAPI.supportsUninstall(binaryPath))) {
            log.warn(`${binaryPath} does not support --uninstall, removing the sdp and leaving its pool files behind`);
            await holdChecksums(() => fs.promises.rm(path.join(getPackagePath(), `${packageMd5}.sdp`)));

            return;
        }

        // Checksums read the pool files and the sdp this is about to take away.
        return holdChecksums(() => this.runUninstall(binaryPath, packageMd5));
    }

    private runUninstall(binaryPath: string, packageMd5: string) {
        return new Promise<void>((resolve, reject) => {
            try {
                log.debug(`Uninstalling ${packageMd5}...`);

                const prdProcess = spawn(binaryPath, ["--filesystem-writepath", getAssetsPath(), "--uninstall", packageMd5]);
                const errors: string[] = [];

                prdProcess.stdout?.on("data", (stdout: Buffer) => {
                    log.debug(stdout.toString().trim());
                });

                prdProcess.stderr?.on("data", (stderr: Buffer) => {
                    const output = stderr.toString().trim();
                    log.error(output);
                    errors.push(output);
                });

                prdProcess.on("error", (err) => {
                    log.error(err);
                    reject(err);
                });

                prdProcess.on("exit", (code, signal) => {
                    if (code !== 0) {
                        reject(new Error(`pr-downloader exited with code ${code}, signal ${signal}: ${errors.join(" ")}`));
                    } else {
                        resolve();
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
