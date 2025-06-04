// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export interface SdpFileMeta {
    fileName: string;
    md5: string;
    crc32: string;
    filesizeBytes: number;
    archivePath: string;
}

export interface SdpFile extends SdpFileMeta {
    data: Buffer;
}
