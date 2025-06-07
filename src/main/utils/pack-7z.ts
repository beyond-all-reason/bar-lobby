// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { pack, cmd } from "$/7zip-min/7zip-min";

export function pack7z(archivePath: string, outputPath: string) {
    return new Promise<void>((resolve, reject) => {
        pack(archivePath, outputPath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

export function packSpecificFiles(outputPath: string, files: string[]) {
    return new Promise<void>((resolve, reject) => {
        cmd(["a", `${outputPath}`, ...files], (err) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
