import { spawn } from "child_process";
import { lastInArray, removeFromArray } from "jaz-ts-utils";
import os from "os";
import path from "path";
import { reactive } from "vue";

import { AbstractContentAPI } from "@/api/content/abstract-content";
import { DownloadInfo } from "@/model/downloads";
import { PrdProgressMessage } from "@/model/pr-downloader";

/**
 * https://github.com/beyond-all-reason/pr-downloader
 * https://springrts.com/wiki/Pr-downloader
 * https://springrts.com/wiki/Rapid
 */
export abstract class PrDownloaderAPI<T> extends AbstractContentAPI<T> {
    protected downloadContent(type: "game" | "map", name: string) {
        return new Promise<void>((resolve) => {
            console.debug(`Downloading ${name}...`);

            const latestEngine = lastInArray(api.content.engine.installedVersions)!.id;
            const binaryName = process.platform === "win32" ? "pr-downloader.exe" : "pr-downloader";
            const prBinaryPath = path.join(api.info.contentPath, "engine", latestEngine, binaryName);
            const downloadArg = type === "game" ? "--download-game" : "--download-map";

            const prdProcess = spawn(`${prBinaryPath}`, ["--filesystem-writepath", api.info.contentPath, downloadArg, name], {
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
                    console.debug(message);

                    if (message.startsWith("[Progress]")) {
                        const progressData = this.parseProgressMessage(message);
                        const progress: PrdProgressMessage = {
                            downloadType: type,
                            content: name,
                            ...progressData,
                        };

                        if (progress.totalBytes > 1) {
                            if (!downloadInfo) {
                                downloadInfo = reactive({
                                    type,
                                    name,
                                    currentBytes: progress.currentBytes,
                                    totalBytes: progress.totalBytes,
                                });

                                this.currentDownloads.push(downloadInfo);

                                this.downloadStarted(downloadInfo);
                            } else {
                                downloadInfo.currentBytes = progress.currentBytes;
                                downloadInfo.totalBytes = progress.totalBytes;
                            }
                        }
                    } else if (message.includes("download_name():[Download] ") && downloadInfo) {
                        downloadInfo.name = message.split("download_name():[Download] ")[1];
                    }
                }
            });

            prdProcess.on("error", (err) => {
                console.error(err);
            });

            prdProcess.stderr?.on("data", (data: Buffer) => {
                console.error(data.toString());
            });

            prdProcess.on("exit", () => {
                if (downloadInfo) {
                    this.downloadComplete(downloadInfo);
                    removeFromArray(this.currentDownloads, downloadInfo);

                    console.debug(`Downloaded ${downloadInfo.name}`);
                }

                resolve();
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
