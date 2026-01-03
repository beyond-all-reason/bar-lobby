// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as fs from "fs";
import * as path from "path";
import { logger } from "@main/utils/logger";
import { fileExists } from "@main/utils/file";
import { ModInfo } from "./mod-types";
import { list, cmd } from "$/7zip-min/7zip-min";

const log = logger("github-mod-downloader.ts");

export class GitHubModDownloader {
    private readonly githubApiBase = "https://api.github.com";
    private readonly githubRawBase = "https://raw.githubusercontent.com";

    public async downloadMod(repository: string, gitRef: string, targetPath: string): Promise<string> {
        const [owner, repo] = repository.split("/");
        if (!owner || !repo) {
            throw new Error(`Invalid repository format: ${repository}`);
        }

        log.info(`Downloading mod from GitHub: ${owner}/${repo}@${gitRef}`);

        // Create target directory
        await fs.promises.mkdir(targetPath, { recursive: true });

        try {
            // Download repo as ZIP
            const zipPath = await this.downloadRepositoryZip(owner, repo, gitRef, targetPath);

            // Extract ZIP - returns the actual mod path (includes GitHub root folder)
            const modPath = await this.extractModFiles(zipPath, targetPath);

            // Clean up ZIP file
            await fs.promises.unlink(zipPath);

            // Validate mod structure
            await this.validateModStructure(modPath);

            log.info(`Successfully downloaded mod to: ${modPath}`);
            return modPath;
        } catch (error) {
            // Cleanup on failure
            await fs.promises.rm(targetPath, { recursive: true, force: true });
            throw error;
        }
    }

    private async downloadRepositoryZip(owner: string, repo: string, gitRef: string, targetPath: string): Promise<string> {
        const zipUrl = `${this.githubApiBase}/repos/${owner}/${repo}/zipball/${gitRef}`;
        const zipPath = path.join(targetPath, `${repo}-${gitRef}.zip`);

        log.info(`Downloading ZIP from: ${zipUrl}`);

        const response = await fetch(zipUrl);
        if (!response.ok) {
            throw new Error(`Failed to download repository ZIP: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        await fs.promises.writeFile(zipPath, Buffer.from(arrayBuffer));

        return zipPath;
    }

    private async extractModFiles(zipPath: string, targetPath: string): Promise<string> {
        const entries = await this.listArchiveContents(zipPath);

        // Find the root directory (usually named like "owner-repo-commitHash")
        const rootDir = entries[0]?.name.split("/")[0];
        if (!rootDir) {
            throw new Error("Could not determine root directory in ZIP");
        }

        // Extract directly to targetPath (creates targetPath/github-root-folder/)
        await this.extractArchive(zipPath, targetPath);

        // Move files from nested GitHub folder up to targetPath
        const githubRootPath = path.join(targetPath, rootDir);
        await this.flattenDirectory(githubRootPath, targetPath);

        // Remove the now-empty GitHub root folder
        await fs.promises.rm(githubRootPath, { recursive: true, force: true });

        // Return the target path (Spring engine expects files here)
        return targetPath;
    }

    private async flattenDirectory(sourceDir: string, targetDir: string): Promise<void> {
        log.debug(`Flattening ${sourceDir} -> ${targetDir}`);
        const entries = await fs.promises.readdir(sourceDir, { withFileTypes: true });

        for (const entry of entries) {
            const sourcePath = path.join(sourceDir, entry.name);
            const targetPath = path.join(targetDir, entry.name);

            if (entry.isDirectory()) {
                // Create target directory and recursively copy contents
                await fs.promises.mkdir(targetPath, { recursive: true });
                await this.flattenDirectory(sourcePath, targetPath);
                // Remove source directory after moving contents
                await fs.promises.rmdir(sourcePath);
            } else {
                // Move file up to target directory
                log.debug(`Moving file: ${sourcePath} -> ${targetPath}`);
                await fs.promises.rename(sourcePath, targetPath);
            }
        }
    }

    private async listArchiveContents(archivePath: string): Promise<Array<{ name: string; attr?: string }>> {
        return new Promise((resolve, reject) => {
            list(archivePath, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    private async extractArchive(archivePath: string, outputPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            cmd(["x", archivePath, "-y", `-o${outputPath}`], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private async validateModStructure(modPath: string): Promise<void> {
        const modinfoPath = path.join(modPath, "modinfo.lua");

        if (!(await fileExists(modinfoPath))) {
            throw new Error("modinfo.lua not found - invalid mod structure");
        }

        // Parse modinfo.lua to validate
        try {
            const modinfoContent = await fs.promises.readFile(modinfoPath, "utf-8");
            const modInfo = this.parseModInfo(modinfoContent);

            // Validate required fields
            if (!modInfo.name || !modInfo.shortname || !modInfo.version) {
                throw new Error(`Invalid modinfo.lua - missing required fields: name='${modInfo.name}', shortname='${modInfo.shortname}', version='${modInfo.version}'`);
            }

            log.info(`Validated mod: ${modInfo.name} ${modInfo.version}`);
        } catch (error) {
            throw new Error(`Invalid modinfo.lua: ${error}`);
        }
    }

    private parseModInfo(content: string): ModInfo {
        // Simple Lua table parser for modinfo.lua
        // This is a basic implementation - in production you might want to use a proper Lua parser

        const lines = content.split("\n");
        const modInfo: Partial<ModInfo> = {};

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip comments and empty lines
            if (trimmed.startsWith("--") || trimmed === "") continue;

            // Parse key-value pairs
            const match = trimmed.match(/^(\w+)\s*=\s*['"]([^'"]*)['"]/);
            if (match) {
                const [, key, value] = match;
                (modInfo as Record<string, string | string[]>)[key] = value;
            }

            // Parse depend array
            if (trimmed.includes("depend")) {
                const dependMatch = trimmed.match(/depend\s*=\s*\{([^}]+)\}/);
                if (dependMatch) {
                    const dependContent = dependMatch[1];
                    const dependItems = dependContent.match(/\[\[([^\]]+)\]\]/g);
                    if (dependItems) {
                        modInfo.depend = dependItems.map((item) => item.replace(/\[\[|\]\]/g, "").trim());
                    }
                }
            }
        }

        return modInfo as ModInfo;
    }

    public async getModInfo(repository: string, gitRef: string): Promise<ModInfo> {
        const [owner, repo] = repository.split("/");
        if (!owner || !repo) {
            throw new Error(`Invalid repository format: ${repository}`);
        }

        const modinfoUrl = `${this.githubRawBase}/${owner}/${repo}/${gitRef}/modinfo.lua`;
        const response = await fetch(modinfoUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch modinfo.lua: ${response.status} ${response.statusText}`);
        }

        const content = await response.text();
        return this.parseModInfo(content);
    }

    public async checkModExists(repository: string, gitRef: string): Promise<boolean> {
        try {
            await this.getModInfo(repository, gitRef);
            return true;
        } catch {
            return false;
        }
    }
}
