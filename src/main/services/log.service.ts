import { ipcMain } from "electron";
import { LOGS_PATH } from "@main/config/app";
import path from "path";
import { glob, stat, rm, cp } from "fs/promises";
import { readFileSync } from "fs";
import { packSpecificFiles } from "@main/utils/pack-7z";
import { randomBytes } from "crypto";
import axios from "axios";
import { logger } from "@main/utils/logger";

async function getSortedLogFiles() {
    type logData = {
        createTime: number;
        logPath: string;
    };

    // Get the log files from the log directory.
    const fileList: string[] = [];
    for await (const entry of glob("*.log", { cwd: LOGS_PATH })) {
        const logPath = path.join(LOGS_PATH, entry);
        fileList.push(logPath);
    }

    // Sort them based on descending file creation time.
    const fileDataList: logData[] = await Promise.all(
        fileList.map(async (logPath) => {
            const statData = await stat(logPath);
            return {
                createTime: statData.birthtimeMs,
                logPath: logPath,
            };
        })
    );
    fileDataList.sort((a, b) => {
        return b.createTime - a.createTime;
    });

    return fileDataList.map((logFile) => logFile.logPath);
}

export async function purgeLogFiles() {
    const fileList = await getSortedLogFiles();

    // Keep only the 7 most recent log files.
    const filesToDelete = fileList.slice(7);
    const remainingFiles = fileList.slice(0, 7);

    for await (const logFilePath of filesToDelete) {
        await rm(logFilePath);
    }

    // Delete all zip files
    for await (const entry of glob("*.zip", { cwd: LOGS_PATH })) {
        const zipPath = path.join(LOGS_PATH, entry);
        await rm(zipPath);
    }

    return remainingFiles;
}

export async function packLogFiles() {
    // Send only the 7 most recent log files.
    const filesToPack = await purgeLogFiles();

    // Copy the current log file into it's own file to upload to avoid lock issue.
    const currentFile = filesToPack.shift();

    // Quit if no files to pack yet.
    if (currentFile == undefined) {
        return null;
    }

    const newFileName = `${path.basename(currentFile, ".log")}copy.log`;
    const newFilePath = path.join(LOGS_PATH, newFileName);
    filesToPack.unshift(newFilePath);

    await cp(currentFile, newFilePath);

    // Pack the files into the ZIP file.
    const archiveTime = new Date()
        .toISOString()
        .replace(/[^0-9T]/g, "")
        .substring(0, 13);
    const archiveRandom = randomBytes(6).toString("base64url");
    const archiveFile = `logs-${archiveTime}-${archiveRandom}.zip`;
    const archivePath = path.join(LOGS_PATH, archiveFile);

    await packSpecificFiles(archivePath, filesToPack);

    // Delete the copied file.
    await rm(newFilePath);
    return archivePath;
}

export async function uploadLogFiles() {
    const archivePath = await packLogFiles();
    if (archivePath == null) {
        return;
    }

    const archiveFile = path.basename(archivePath);

    axios({
        method: "put",
        url: "https://log.beyondallreason.dev/" + archiveFile,
        headers: {
            "content-type": "application/zip",
        },
        data: readFileSync(archivePath),
        validateStatus: function (status) {
            return status === 200;
        },
    }).catch(() => {
        throw new Error("Could not upload log file.");
    });
}

export type logLevels = "debug" | "info" | "error" | "fatal";

export async function log(fileName: string, level: logLevels, msg: string) {
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
