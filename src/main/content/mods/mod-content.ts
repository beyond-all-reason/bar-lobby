// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as fs from "fs";
import * as path from "path";
import { parseLuaTable } from "@main/utils/parse-lua-table";
import { logger } from "@main/utils/logger";
import { Signal } from "$/jaz-ts-utils/signal";
import { AbstractContentAPI } from "@main/content/abstract-content";
import { MOD_PATHS } from "@main/config/app";
import { fileExists } from "@main/utils/file";
import { ModMetadata, ModInfo, ModType, ModDependency, ModInstallOptions, ModConflict } from "./mod-types";
import { GitHubModDownloader } from "./github-mod-downloader";

const log = logger("mod-content.ts");

export class ModContentAPI extends AbstractContentAPI<string, ModMetadata> {
    public readonly githubDownloader = new GitHubModDownloader();
    public readonly onModInstalled: Signal<string> = new Signal();
    public readonly onModUninstalled: Signal<string> = new Signal();
    public readonly onModConflict: Signal<ModConflict> = new Signal();

    public override async init() {
        for (const modsDir of MOD_PATHS) {
            await fs.promises.mkdir(modsDir, { recursive: true });
        }
        await this.scanInstalledMods();
        return this;
    }

    protected async scanInstalledMods() {
        log.info("Scanning for installed mods");

        for (const modsDir of MOD_PATHS) {
            if (await fileExists(modsDir)) {
                const entries = await fs.promises.readdir(modsDir, { withFileTypes: true });

                for (const entry of entries) {
                    if (entry.isDirectory() && entry.name.endsWith(".sdd")) {
                        const modPath = path.join(modsDir, entry.name);
                        try {
                            const modMetadata = await this.parseModMetadata(modPath);
                            this.availableVersions.set(modMetadata.id, modMetadata);
                            log.info(`-- Found mod: ${modMetadata.name} ${modMetadata.version}`);
                        } catch (err) {
                            log.warn(`Failed to parse mod ${entry.name}: ${err}`);
                        }
                    }
                }
            }
        }

        log.info(`Found ${this.availableVersions.size} installed mods`);
    }

    private async parseModMetadata(modPath: string): Promise<ModMetadata> {
        const modinfoPath = path.join(modPath, "modinfo.lua");

        if (!(await fileExists(modinfoPath))) {
            throw new Error(`modinfo.lua not found in ${modPath}`);
        }

        const modinfoBuffer = await fs.promises.readFile(modinfoPath);
        const modInfo = parseLuaTable(modinfoBuffer) as ModInfo;

        // Generate unique ID from folder name and version
        const id = `${modInfo.shortname}-${modInfo.version}`.toLowerCase();

        // Parse dependencies
        const dependencies: ModDependency[] =
            modInfo.depend?.map((dep) => {
                if (dep.startsWith("rapid://")) {
                    const [, identifier, version] = dep.split("://")[1].split(":");
                    return {
                        type: "rapid",
                        identifier,
                        version: version || "stable",
                    };
                } else if (dep.startsWith("github://")) {
                    const [, owner, repo, gitRef] = dep.split("://")[1].split("/");
                    return {
                        type: "github",
                        identifier: `${owner}/${repo}`,
                        repository: `${owner}/${repo}`,
                        gitRef: gitRef || "main",
                    };
                } else {
                    return {
                        type: "local",
                        identifier: dep,
                    };
                }
            }) || [];

        return {
            id,
            name: modInfo.name,
            description: modInfo.description,
            version: modInfo.version,
            shortname: modInfo.shortname,
            author: this.extractAuthorFromPath(modPath),
            repository: this.extractRepositoryFromPath(modPath),
            gitRef: "main", // Default, could be stored in metadata
            modtype: modInfo.modtype as ModType,
            dependencies,
            isInstalled: true,
            isDownloading: false,
            installPath: modPath,
            lastUpdated: await this.getLastModified(modPath),
        };
    }

    private extractAuthorFromPath(modPath: string): string {
        // Try to extract author from path structure
        const pathParts = modPath.split(path.sep);
        const authorIndex = pathParts.findIndex((part) => part === "mods");
        return authorIndex >= 0 && pathParts[authorIndex + 1] ? pathParts[authorIndex + 1] : "Unknown";
    }

    private extractRepositoryFromPath(modPath: string): string {
        // Try to extract repository from path structure
        const pathParts = modPath.split(path.sep);
        const modsIndex = pathParts.findIndex((part) => part === "mods");
        if (modsIndex >= 0 && pathParts[modsIndex + 1] && pathParts[modsIndex + 2]) {
            return `${pathParts[modsIndex + 1]}/${pathParts[modsIndex + 2]}`;
        }
        return "";
    }

    private async getLastModified(dirPath: string): Promise<Date> {
        const stats = await fs.promises.stat(dirPath);
        return stats.mtime;
    }

    public async installModFromGitHub(options: ModInstallOptions): Promise<ModMetadata> {
        const { repository, gitRef = "main", targetPath, overwrite = false } = options;

        if (!overwrite && (await fileExists(targetPath))) {
            throw new Error(`Mod already exists at ${targetPath}`);
        }

        log.info(`Installing mod from GitHub: ${repository}@${gitRef}`);

        try {
            // Download mod from GitHub
            const modPath = await this.githubDownloader.downloadMod(repository, gitRef, targetPath);

            // Parse mod metadata
            const modMetadata = await this.parseModMetadata(modPath);

            // Add to available versions
            this.availableVersions.set(modMetadata.id, modMetadata);

            // Check for conflicts
            await this.checkModConflicts(modMetadata);

            this.onModInstalled.dispatch(modMetadata.id);
            log.info(`Successfully installed mod: ${modMetadata.name}`);

            return modMetadata;
        } catch (error) {
            log.error(`Failed to install mod from GitHub: ${error}`);
            throw error;
        }
    }

    public async uninstallMod(modId: string): Promise<void> {
        const mod = this.availableVersions.get(modId);
        if (!mod) {
            throw new Error(`Mod ${modId} not found`);
        }

        log.info(`Uninstalling mod: ${mod.name}`);

        try {
            // Remove mod directory
            await fs.promises.rm(mod.installPath, { recursive: true, force: true });

            // Remove from available versions
            this.availableVersions.delete(modId);

            this.onModUninstalled.dispatch(modId);
            log.info(`Successfully uninstalled mod: ${mod.name}`);
        } catch (error) {
            log.error(`Failed to uninstall mod: ${error}`);
            throw error;
        }
    }

    public async updateMod(modId: string): Promise<ModMetadata> {
        const mod = this.availableVersions.get(modId);
        if (!mod) {
            throw new Error(`Mod ${modId} not found`);
        }

        if (!mod.repository) {
            throw new Error(`Mod ${modId} has no repository information`);
        }

        log.info(`Updating mod: ${mod.name}`);

        // Reinstall from GitHub
        const updatedMod = await this.installModFromGitHub({
            repository: mod.repository,
            gitRef: mod.gitRef,
            targetPath: mod.installPath,
            overwrite: true,
        });

        return updatedMod;
    }

    private async checkModConflicts(mod: ModMetadata): Promise<void> {
        // Check for file conflicts with other mods
        const conflicts: ModConflict[] = [];

        for (const [otherModId, otherMod] of this.availableVersions) {
            if (otherModId === mod.id) continue;

            const conflictingFiles = await this.findConflictingFiles(mod.installPath, otherMod.installPath);

            if (conflictingFiles.length > 0) {
                conflicts.push({
                    modId: otherModId,
                    conflictingFiles,
                    severity: "warning",
                    message: `Mod ${mod.name} conflicts with ${otherMod.name} on ${conflictingFiles.length} files`,
                });
            }
        }

        // Dispatch conflict events
        for (const conflict of conflicts) {
            this.onModConflict.dispatch(conflict);
        }
    }

    private async findConflictingFiles(modPath1: string, modPath2: string): Promise<string[]> {
        const conflictingFiles: string[] = [];

        try {
            const files1 = await this.getAllFiles(modPath1);
            const files2 = await this.getAllFiles(modPath2);

            for (const file1 of files1) {
                const relativePath = path.relative(modPath1, file1);
                const file2 = path.join(modPath2, relativePath);

                if (files2.includes(file2)) {
                    conflictingFiles.push(relativePath);
                }
            }
        } catch (error) {
            log.warn(`Error checking for conflicts: ${error}`);
        }

        return conflictingFiles;
    }

    private async getAllFiles(dirPath: string): Promise<string[]> {
        const files: string[] = [];

        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                const subFiles = await this.getAllFiles(fullPath);
                files.push(...subFiles);
            } else {
                files.push(fullPath);
            }
        }

        return files;
    }

    public getModsByType(modType: ModType): ModMetadata[] {
        return Array.from(this.availableVersions.values()).filter((mod): mod is ModMetadata => mod.modtype === modType);
    }

    public getModsByGame(gameShortName: string): ModMetadata[] {
        return Array.from(this.availableVersions.values()).filter((mod): mod is ModMetadata => {
            // Check if mod is compatible with the game
            return mod.dependencies.some((dep) => dep.type === "rapid" && dep.identifier === gameShortName.toLowerCase());
        });
    }

    public isModInstalled(modId: string): boolean {
        return this.availableVersions.has(modId);
    }

    public getMod(modId: string): ModMetadata | undefined {
        return this.availableVersions.get(modId);
    }

    public isVersionInstalled(id: string): boolean {
        return this.availableVersions.has(id);
    }

    public async uninstallVersion(version: string | ModMetadata): Promise<void> {
        const modId = typeof version === "string" ? version : version.id;
        await this.uninstallMod(modId);
    }
}
