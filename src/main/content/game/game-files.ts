// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { getGamePaths, getPackagePath, getPoolPath } from "@main/config/app";
import { SdpFile, SdpFileMeta } from "@main/content/game/sdp";
import { BufferStream } from "@main/utils/buffer-stream";
import { fileExists } from "@main/utils/file";
import * as fs from "fs";
import { glob } from "glob";
import { Minimatch } from "minimatch";
import * as path from "path";
import util from "util";
import zlib from "zlib";

const gunzip = util.promisify(zlib.gunzip);

export async function parseSdpFile(sdpFilePath: string, filePattern?: string): Promise<SdpFileMeta[]> {
    const sdpFileZipped = await fs.promises.readFile(sdpFilePath);
    const sdpFile = zlib.gunzipSync(sdpFileZipped);
    const bufferStream = new BufferStream(sdpFile, true);
    const fileData: SdpFileMeta[] = [];
    let matcher: Minimatch | undefined;
    if (filePattern) {
        matcher = new Minimatch(filePattern);
    }
    while (bufferStream.readStream.readableLength > 0) {
        const fileNameLength = bufferStream.readInt(1, true);
        const fileName = bufferStream.readString(fileNameLength);
        const md5 = bufferStream.read(16).toString("hex");
        const crc32 = bufferStream.read(4).toString("hex");
        const filesizeBytes = bufferStream.readInt(4, true);
        const archivePath = path.join(getPoolPath(), md5.slice(0, 2), `${md5.slice(2)}.gz`);
        if (matcher && matcher.match(fileName)) {
            fileData.push({ fileName, md5, crc32, filesizeBytes, archivePath });
        } else if (!matcher) {
            fileData.push({ fileName, md5, crc32, filesizeBytes, archivePath });
        }
    }
    return fileData;
}

/**
 * @param filePattern glob pattern for which files to retrieve
 * @example getGameFiles("Beyond All Reason test-16289-b154c3d", "units/CorAircraft/T2/*.lua")
 */
export async function getGameFiles(packageMd5: string, filePattern: string, parseData?: false): Promise<SdpFileMeta[]>;
export async function getGameFiles(packageMd5: string, filePattern: string, parseData?: true): Promise<SdpFile[]>;
export async function getGameFiles(packageMd5: string, filePattern: string, parseData = false): Promise<SdpFileMeta[] | SdpFile[]> {
    // Custom game versions are stored in the games directory
    if (packageMd5.endsWith(".sdd")) {
        const gameDirName = packageMd5;
        const sdpFiles: Array<SdpFileMeta & { data?: Buffer }> = [];
        const customGameDir = await (async () => {
            for (const gamesDir of getGamePaths()) {
                const customGameDir = path.join(gamesDir, gameDirName);
                if (await fileExists(customGameDir)) {
                    return customGameDir;
                }
            }
            throw new Error(`Custom game directory not found for: ${gameDirName}`);
        })();
        const files = await glob(path.join(customGameDir, filePattern), { windowsPathsNoEscape: true });
        for (const file of files) {
            const sdpData = {
                archivePath: file,
                fileName: path.parse(file).base,
                crc32: "",
                md5: "",
                filesizeBytes: 0,
            };
            if (parseData) {
                const data = await fs.promises.readFile(file);
                sdpFiles.push({ ...sdpData, data });
            } else {
                sdpFiles.push(sdpData);
            }
        }
        return sdpFiles;
    }
    // Normal game versions are stored in the packages directory
    const filePath = path.join(getPackagePath(), `${packageMd5}.sdp`);
    const sdpEntries = await parseSdpFile(filePath, filePattern);
    const sdpFiles: Array<SdpFileMeta & { data?: Buffer }> = [];
    for (const sdpEntry of sdpEntries) {
        const archiveFilePath = path.join(getPoolPath(), sdpEntry.md5.slice(0, 2), `${sdpEntry.md5.slice(2)}.gz`);
        const archiveFile = await fs.promises.readFile(archiveFilePath);
        if (parseData) {
            const data = await gunzip(archiveFile);
            sdpFiles.push({ ...sdpEntry, data });
        } else {
            sdpFiles.push(sdpEntry);
        }
    }
    return sdpFiles;
}
