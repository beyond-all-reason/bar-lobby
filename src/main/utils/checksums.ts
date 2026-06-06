// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as path from "path";
import { spawn } from "child_process";
import { logger } from "@main/utils/logger";
import { getEnginePath, WRITE_DATA_PATH, getAssetsPath } from "@main/config/app";

const log = logger("checksums.ts");

let checksumQueue: Promise<void> = Promise.resolve();

export function calcChecksum(engineVersion: string, archiveName: string): Promise<void> {
    checksumQueue = checksumQueue.then(() => runChecksumProcess(engineVersion, archiveName));
    return checksumQueue;
}

function runChecksumProcess(engineVersion: string, archiveName: string): Promise<void> {
    const enginePath = path.join(getEnginePath(), engineVersion).replaceAll("\\", "/");
    const binaryName = process.platform === "win32" ? "spring-headless.exe" : "./spring-headless";
    // --calc-checksum does not return a value to us; it causes the engine to write a checksum cache
    // file to disk that speeds up subsequent archive loading (avoids re-scanning on next launch).
    const args = ["--write-dir", WRITE_DATA_PATH, "--isolation", "--calc-checksum", archiveName];

    log.debug(`Calculating checksum for: ${archiveName}`);
    return new Promise<void>((resolve) => {
        const proc = spawn(binaryName, args, {
            cwd: enginePath,
            stdio: "pipe",
            env: { ...process.env, SPRING_DATADIR: getAssetsPath() },
        });
        proc.on("exit", (code) => {
            if (code !== 0) log.warn(`calcChecksum exited with code ${code} for: ${archiveName}`);
            resolve();
        });
        proc.on("error", (err) => {
            log.warn(`calcChecksum failed for ${archiveName}: ${err}`);
            resolve();
        });
    });
}
