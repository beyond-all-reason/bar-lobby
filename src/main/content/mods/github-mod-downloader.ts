// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as fs from "fs";
import * as path from "path";
import { logger } from "@main/utils/logger";
import { fileExists } from "@main/utils/file";
import { ModInfo } from "./mod-types";
import AdmZip from "adm-zip";

const log = logger("github-mod-downloader.ts");

export class GitHubModDownloader {
    private readonly githubApiBase = "https://api.github.com";
    private readonly githubRawBase = "https://raw.githubusercontent.com";

    public async downloadMod(repository: string, branch: string, targetPath: string): Promise<string> {
        const [owner, repo] = repository.split("/");
        if (!owner || !repo) {
            throw new Error(`Invalid repository format: ${repository}`);
        }

        log.info(`Downloading mod from GitHub: ${owner}/${repo}@${branch}`);

        // Create target directory
        await fs.promises.mkdir(targetPath, { recursive: true });

        try {
            // Download repo as ZIP
            const zipPath = await this.downloadRepositoryZip(owner, repo, branch, targetPath);

            // Extract ZIP and filter mod files
            await this.extractModFiles(zipPath, targetPath);

            // Clean up ZIP file
            await fs.promises.unlink(zipPath);

            // Validate mod structure
            await this.validateModStructure(targetPath);

            log.info(`Successfully downloaded mod to: ${targetPath}`);
            return targetPath;
        } catch (error) {
            // Cleanup on failure
            await fs.promises.rm(targetPath, { recursive: true, force: true });
            throw error;
        }
    }

    private async downloadRepositoryZip(owner: string, repo: string, branch: string, targetPath: string): Promise<string> {
        const zipUrl = `${this.githubApiBase}/repos/${owner}/${repo}/zipball/${branch}`;
        const zipPath = path.join(targetPath, `${repo}-${branch}.zip`);

        log.info(`Downloading ZIP from: ${zipUrl}`);

        const response = await fetch(zipUrl);
        if (!response.ok) {
            throw new Error(`Failed to download repository ZIP: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        await fs.promises.writeFile(zipPath, Buffer.from(arrayBuffer));

        return zipPath;
    }

    private async extractModFiles(zipPath: string, targetPath: string): Promise<void> {
        const zip = new AdmZip(zipPath);
        const entries = zip.getEntries();

        // Find the root directory (usually named like "owner-repo-commitHash")
        const rootDir = entries[0]?.entryName.split("/")[0];
        if (!rootDir) {
            throw new Error("Could not determine root directory in ZIP");
        }

        // Extract only mod-relevant files
        for (const entry of entries) {
            if (entry.isDirectory) continue;

            const relativePath = entry.entryName.replace(`${rootDir}/`, "");

            // Skip non-mod files
            if (this.shouldSkipFile(relativePath)) continue;

            const filePath = path.join(targetPath, relativePath);
            const fileDir = path.dirname(filePath);

            // Create directory if it doesn't exist
            await fs.promises.mkdir(fileDir, { recursive: true });

            // Extract file
            const fileContent = entry.getData();
            await fs.promises.writeFile(filePath, fileContent);

            log.debug(`Extracted: ${relativePath}`);
        }
    }

    private shouldSkipFile(relativePath: string): boolean {
        const skipPatterns = [
            /^\.git\//,
            /^\.github\//,
            /^\.gitignore$/,
            /^README\.md$/i,
            /^LICENSE$/i,
            /^\.editorconfig$/,
            /^\.gitattributes$/,
            /^\.vscode\//,
            /^\.idea\//,
            /^node_modules\//,
            /^\.DS_Store$/,
            /^Thumbs\.db$/,
        ];

        return skipPatterns.some((pattern) => pattern.test(relativePath));
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
                throw new Error("Invalid modinfo.lua - missing required fields");
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

    public async getModInfo(repository: string, branch: string): Promise<ModInfo> {
        const [owner, repo] = repository.split("/");
        if (!owner || !repo) {
            throw new Error(`Invalid repository format: ${repository}`);
        }

        const modinfoUrl = `${this.githubRawBase}/${owner}/${repo}/${branch}/modinfo.lua`;
        const response = await fetch(modinfoUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch modinfo.lua: ${response.status} ${response.statusText}`);
        }

        const content = await response.text();
        return this.parseModInfo(content);
    }

    public async checkModExists(repository: string, branch: string): Promise<boolean> {
        try {
            await this.getModInfo(repository, branch);
            return true;
        } catch {
            return false;
        }
    }
}

// Interface for GitHub API tree items (currently unused but kept for future use)
// interface GitHubTreeItem {
//     path: string;
//     mode: string;
//     type: "blob" | "tree";
//     sha: string;
//     size?: number;
//     url?: string;
// }
