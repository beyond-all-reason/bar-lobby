// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "path";
import { randomBytes } from "crypto";
import { cp, glob, readFile, rm, stat } from "fs/promises";
import axios from "axios";

import { settingsService } from "@main/services/settings.service";
import { ipcMain } from "@main/typed-ipc";
import { packSpecificFiles } from "@main/utils/pack-7z";
import { ACTIVE_LOG_FILE_PATH, logger } from "@main/utils/logger";
import { LOGS_PATH } from "@main/config/app";

const CANONICAL_LOG_FILE_PATTERN = /^lobby-\d{8}T\d{6}\.log$/;
const RETAINED_LOG_COUNT = 14;
const UPLOADED_LOG_COUNT = 7;

let uploadInProgress = false;

async function getSortedLogFiles() {
    const logFiles: Array<{ createTime: number; logPath: string }> = [];

    for await (const entry of glob("lobby-*.log", { cwd: LOGS_PATH })) {
        if (!CANONICAL_LOG_FILE_PATTERN.test(entry)) {
            continue;
        }

        const logPath = path.join(LOGS_PATH, entry);
        const statData = await stat(logPath);
        logFiles.push({ createTime: statData.birthtimeMs, logPath });
    }

    logFiles.sort((a, b) => b.createTime - a.createTime);
    return logFiles.map(({ logPath }) => logPath);
}

async function removeMatchingFiles(pattern: string) {
    for await (const entry of glob(pattern, { cwd: LOGS_PATH })) {
        await rm(path.join(LOGS_PATH, entry), { force: true });
    }
}

async function removeUploadArtifacts() {
    await Promise.all([removeMatchingFiles("*.zip"), removeMatchingFiles(".upload-*"), removeMatchingFiles("lobby-*most_recent*.log")]);
}

export async function purgeLogFiles() {
    const logFiles = await getSortedLogFiles();
    const activeLogIndex = logFiles.indexOf(ACTIVE_LOG_FILE_PATH);
    const activeLog = activeLogIndex >= 0 ? logFiles[activeLogIndex] : undefined;
    const inactiveLogs = logFiles.filter((logPath) => logPath !== activeLog);

    const retainedInactiveCount = activeLog ? RETAINED_LOG_COUNT - 1 : RETAINED_LOG_COUNT;
    const filesToDelete = inactiveLogs.slice(retainedInactiveCount);

    await Promise.all(filesToDelete.map((logFilePath) => rm(logFilePath, { force: true })));
    await removeUploadArtifacts();

    const uploadedInactiveCount = activeLog ? UPLOADED_LOG_COUNT - 1 : UPLOADED_LOG_COUNT;
    return activeLog ? [activeLog, ...inactiveLogs.slice(0, uploadedInactiveCount)] : inactiveLogs.slice(0, uploadedInactiveCount);
}

function createArchivePath() {
    const archiveTime = new Date()
        .toISOString()
        .replace(/[^0-9T]/g, "")
        .substring(0, 13);
    const archiveRandom = randomBytes(6).toString("base64url");
    return path.join(LOGS_PATH, `logs-${archiveTime}-${archiveRandom}.zip`);
}

export async function packLogFiles() {
    const filesToPack = await purgeLogFiles();
    const currentFile = filesToPack.shift();

    if (!currentFile) {
        throw new Error("No log files to pack.");
    }

    const temporaryPath = path.join(LOGS_PATH, `.upload-${randomBytes(8).toString("hex")}-most_recent.log`);
    const archivePath = createArchivePath();

    try {
        await cp(currentFile, temporaryPath);
        await packSpecificFiles(archivePath, [temporaryPath, ...filesToPack]);
        return archivePath;
    } catch (error) {
        await rm(archivePath, { force: true });
        throw error;
    } finally {
        await rm(temporaryPath, { force: true });
    }
}

export async function uploadLogFiles() {
    if (uploadInProgress) {
        throw new Error("Log upload is already in progress.");
    }

    uploadInProgress = true;
    let archivePath: string | undefined;

    try {
        archivePath = await packLogFiles();
        const archiveFile = path.basename(archivePath);
        const uploadUrl = settingsService.getSettings().logUploadUrl + archiveFile;
        const dataToUpload = await readFile(archivePath);

        await axios({
            method: "put",
            url: uploadUrl,
            headers: {
                "content-type": "application/zip",
            },
            data: dataToUpload,
        });

        return uploadUrl;
    } finally {
        try {
            if (archivePath) {
                await rm(archivePath, { force: true });
            }
        } finally {
            uploadInProgress = false;
        }
    }
}

export type logLevels = "debug" | "info" | "error" | "fatal";

async function log(fileName: string, level: logLevels, msg: string) {
    const logInstance = logger(fileName, {
        source: "renderer",
        separator: " - ",
        level: "debug",
    });

    switch (level) {
        case "debug":
            logInstance.debug(msg);
            break;
        case "info":
            logInstance.info(msg);
            break;
        case "error":
            logInstance.error(msg);
            break;
        case "fatal":
            logInstance.fatal(msg);
            break;
    }
}

function registerIpcHandlers() {
    ipcMain.handle("log:purge", purgeLogFiles);
    ipcMain.handle("log:pack", packLogFiles);
    ipcMain.handle("log:upload", uploadLogFiles);
    ipcMain.handle("log:log", async (_, fileName: string, level: logLevels, msg: string) => log(fileName, level, msg));
}

export const logService = {
    registerIpcHandlers,
};
