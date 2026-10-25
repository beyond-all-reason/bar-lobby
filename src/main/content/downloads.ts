// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export type DownloadInfo = {
    type: "engine" | "game" | "map" | "update";
    // What was asked for. Separate from name because pr-downloader replaces that with a name of its
    // own choosing partway through, and progress from concurrent downloads has to stay told apart.
    id: string;
    name: string;
    currentBytes: number;
    totalBytes: number;
    progress: number;
    phase?: "downloading" | "extracting";
};

export type SpringFilesMapMeta = {
    category: string;
    filename: string;
    keywords: string;
    md5: string;
    mirrors: string[];
    name: string;
    path: string;
    sdp: string;
    size: number;
    springname: string;
    tags: string[];
    timestamp: string;
    version: string;
};
