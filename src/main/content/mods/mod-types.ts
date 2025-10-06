// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export interface ModInfo {
    name: string;
    description: string;
    version: string;
    shortname: string;
    mutator: string;
    game: string;
    shortGame: string;
    modtype: number;
    depend: string[];
}

export interface ModMetadata {
    id: string;
    name: string;
    description: string;
    version: string;
    shortname: string;
    author: string;
    repository: string;
    gitRef: string;
    modtype: ModType;
    dependencies: ModDependency[];
    isInstalled: boolean;
    isDownloading: boolean;
    installPath: string;
    lastUpdated: Date;
    downloadUrl?: string;
    fileSize?: number;
}

export interface ModDependency {
    type: "rapid" | "github" | "local";
    identifier: string;
    version?: string;
    repository?: string;
    gitRef?: string;
}

export enum ModType {
    GAME = 1,
    MAP = 2,
    MUTATOR = 3,
    INTERFACE = 4,
}

export interface ModInstallOptions {
    repository: string;
    gitRef?: string;
    targetPath: string;
    overwrite?: boolean;
}

export interface ModSource {
    type: "github" | "rapid" | "local";
    identifier: string;
    repository?: string;
    gitRef?: string;
    version?: string;
}

export interface ModConflict {
    modId: string;
    conflictingFiles: string[];
    severity: "warning" | "error";
    message: string;
}
