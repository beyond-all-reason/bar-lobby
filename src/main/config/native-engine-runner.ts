// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "fs";
import path from "path";

export const BUNDLED_ASSETS_DIR_NAME = "bundled-assets";
export const MACOS_LUAUI_OVERLAY_DIR_NAME = "macos-luaui-overlay";

type PathExists = (filePath: string) => boolean;

export interface NativeEnginePaths {
    assetsPath: string;
    bundledAssetsPath?: string;
    enginePath?: string;
    includeBundledAssetsInSpringDataDir?: boolean;
    includeBundledEngineSupportInSpringDataDir?: boolean;
    includeBundledMacOSLuaUIOverlayInSpringDataDir?: boolean;
}

export interface NativeEngineResolverOptions extends NativeEnginePaths {
    engineVersion: string;
    platform?: NodeJS.Platform;
    pathExists?: PathExists;
}

export interface NativeEngineProcessEnvOptions extends NativeEnginePaths {
    writeDataPath?: string;
    platform?: NodeJS.Platform;
    baseEnv?: NodeJS.ProcessEnv;
    pathExists?: PathExists;
}

export interface MacOSLuaUIOverlaySyncOptions {
    bundledAssetsPath?: string;
    writeDataPath: string;
    platform?: NodeJS.Platform;
}

export interface MacOSLuaUIOverlaySyncResult {
    synced: boolean;
    sourcePath?: string;
    destinationPath?: string;
    reason?: string;
}

export interface NativeEngineRunner {
    enginePath: string;
    binaryFileName: string;
    spawnCommand: string;
}

export interface MacOSGraphicsRuntimePaths {
    vulkanBackend: MacOSVulkanBackend;
    sdl3LibPath: string;
    mesaZinkLibPath: string;
    vulkanLoaderLibPath: string;
    vulkanBackendLibPath: string;
    vulkanBackendICDPath: string;
    vulkanBackendRequiredLibraryPath: string;
    moltenVKLibPath: string;
    moltenVKICDPath: string;
    kosmicKrispLibPath: string;
    kosmicKrispICDPath: string;
    fontconfigConfigDirPath: string;
    fontconfigFilePath: string;
}

export type MacOSVulkanBackend = "moltenvk" | "kosmickrisp";

const LEGACY_DRIVER_DISCOVERY_ENV_KEYS = ["VK_ADD_DRIVER_FILES", "DYLD_FALLBACK_LIBRARY_PATH"] as const;
const MACOS_DIAGNOSTIC_BASELINE_ENV_KEYS = ["ZINK_DEBUG", "MESA_GLTHREAD", "GALLIUM_THREAD"] as const;
export const MACOS_VULKAN_BACKEND_ENV = "BAR_MACOS_VULKAN_BACKEND";
export const MACOS_KOSMICKRISP_BACKEND_MARKER = "bar-vulkan-backend-kosmickrisp";
export const MACOS_DIAGNOSTIC_ENGINE_ENV_GATE = "BAR_MACOS_ALLOW_DIAGNOSTIC_ENGINE_ENV";
export const MACOS_MINIMAL_FPS_WORKAROUND_ENABLE_ENV = "BAR_MACOS_ENABLE_MINIMAL_FPS_WORKAROUND";
export const MACOS_MINIMAL_FPS_WORKAROUND_DISABLE_ENV = "BAR_MACOS_DISABLE_MINIMAL_FPS_WORKAROUND";
export const MACOS_MINIMAL_FPS_WORKAROUND_REASON = "minimal_fps_baseline";
export const MACOS_MINIMAL_FPS_WORKAROUND_ZINK_DEBUG_VALUE = "quiet,flushsync";
export const MACOS_DIAGNOSTIC_ZINK_DEBUG_VALUE = MACOS_MINIMAL_FPS_WORKAROUND_ZINK_DEBUG_VALUE;
const MACOS_RUNTIME_ENV_KEYS = [
    "SPRING_DATADIR",
    "DYLD_LIBRARY_PATH",
    "VK_DRIVER_FILES",
    "VK_ICD_FILENAMES",
    "MESA_LOADER_DRIVER_OVERRIDE",
    "GALLIUM_DRIVER",
    "EGL_PLATFORM",
    "MESA_GL_VERSION_OVERRIDE",
    "MESA_GLSL_VERSION_OVERRIDE",
    "FONTCONFIG_FILE",
    "FONTCONFIG_PATH",
    "XDG_CACHE_HOME",
    MACOS_VULKAN_BACKEND_ENV,
    MACOS_DIAGNOSTIC_ENGINE_ENV_GATE,
    MACOS_MINIMAL_FPS_WORKAROUND_ENABLE_ENV,
    MACOS_MINIMAL_FPS_WORKAROUND_DISABLE_ENV,
] as const;

export const MACOS_NATIVE_ENGINE_ENV_DIAGNOSTIC_PROBE = "MACOS_DIAGNOSTIC_PROBE native-engine-env";
export const MACOS_NATIVE_ENGINE_DATA_DIR_DIAGNOSTIC_PROBE = "MACOS_DIAGNOSTIC_PROBE native-engine-data-dirs";

export function getBundledAssetsPath(resourcesPath: string): string {
    return path.join(resourcesPath, BUNDLED_ASSETS_DIR_NAME);
}

export function getMacOSLuaUIOverlayPath(bundledAssetsPath: string): string {
    return path.join(bundledAssetsPath, MACOS_LUAUI_OVERLAY_DIR_NAME);
}

export async function syncMacOSLuaUIOverlayToWritableDataDir({ bundledAssetsPath, writeDataPath, platform = process.platform }: MacOSLuaUIOverlaySyncOptions): Promise<MacOSLuaUIOverlaySyncResult> {
    if (platform !== "darwin") {
        return { synced: false, reason: "not-macos" };
    }
    if (!bundledAssetsPath) {
        return { synced: false, reason: "missing-bundled-assets-path" };
    }

    const sourcePath = path.join(getMacOSLuaUIOverlayPath(bundledAssetsPath), "LuaUI");
    const destinationPath = path.join(writeDataPath, "LuaUI");
    const sourceStats = await fs.promises.stat(sourcePath).catch((err: NodeJS.ErrnoException) => {
        if (err.code === "ENOENT") {
            return undefined;
        }
        throw err;
    });
    if (!sourceStats?.isDirectory()) {
        return { synced: false, sourcePath, destinationPath, reason: "missing-overlay-luaui" };
    }

    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.promises.cp(sourcePath, destinationPath, { recursive: true, force: true });
    return { synced: true, sourcePath, destinationPath };
}

export function getEngineRootSearchPaths({ assetsPath, bundledAssetsPath }: NativeEnginePaths): string[] {
    return [path.join(assetsPath, "engine"), ...(bundledAssetsPath ? [path.join(bundledAssetsPath, "engine")] : [])];
}

export function getEngineVersionSearchPaths(options: NativeEnginePaths & { engineVersion: string }): string[] {
    return getEngineRootSearchPaths(options).map((engineRoot) => path.join(engineRoot, options.engineVersion));
}

export function getEngineBinaryFileName(platform: NodeJS.Platform = process.platform): string {
    return platform === "win32" ? "spring.exe" : "spring";
}

export function getEngineSpawnCommand(platform: NodeJS.Platform = process.platform): string {
    return platform === "win32" ? "spring.exe" : "./spring";
}

export function getPrDownloaderBinaryFileName(platform: NodeJS.Platform = process.platform): string {
    return platform === "win32" ? "pr-downloader.exe" : "pr-downloader";
}

export function getSpringDataDir(
    {
        assetsPath,
        bundledAssetsPath,
        enginePath,
        includeBundledAssetsInSpringDataDir = true,
        includeBundledEngineSupportInSpringDataDir = false,
        includeBundledMacOSLuaUIOverlayInSpringDataDir = false,
    }: NativeEnginePaths,
    pathExists: PathExists = fs.existsSync
): string {
    const dataDirs: string[] = [];
    if (includeBundledMacOSLuaUIOverlayInSpringDataDir && bundledAssetsPath) {
        const overlayPath = getMacOSLuaUIOverlayPath(bundledAssetsPath);
        if (pathExists(path.join(overlayPath, "LuaUI")) && !dataDirs.includes(overlayPath)) {
            dataDirs.push(overlayPath);
        }
    }
    dataDirs.push(assetsPath);
    if (includeBundledAssetsInSpringDataDir && bundledAssetsPath && pathExists(bundledAssetsPath)) {
        dataDirs.push(bundledAssetsPath);
    }
    if (!includeBundledAssetsInSpringDataDir && includeBundledEngineSupportInSpringDataDir && bundledAssetsPath && pathExists(bundledAssetsPath)) {
        for (const supportDirName of ["engine-fonts", "fonts"]) {
            const supportDir = path.join(bundledAssetsPath, supportDirName);
            if (pathExists(supportDir) && !dataDirs.includes(supportDir)) {
                dataDirs.push(supportDir);
            }
        }
    }
    if (enginePath && pathExists(enginePath) && !dataDirs.includes(enginePath)) {
        dataDirs.push(enginePath);
    }
    return dataDirs.join(path.delimiter);
}

function normalizeMacOSVulkanBackend(value: string | undefined): MacOSVulkanBackend | undefined {
    return value === "moltenvk" || value === "kosmickrisp" ? value : undefined;
}

function getMacOSKosmicKrispBackendMarkerPath(bundledAssetsPath: string): string {
    return path.join(path.dirname(bundledAssetsPath), MACOS_KOSMICKRISP_BACKEND_MARKER);
}

function resolveMacOSVulkanBackend(bundledAssetsPath: string, env: NodeJS.ProcessEnv, pathExists: PathExists): MacOSVulkanBackend {
    return normalizeMacOSVulkanBackend(env[MACOS_VULKAN_BACKEND_ENV]) ?? (pathExists(getMacOSKosmicKrispBackendMarkerPath(bundledAssetsPath)) ? "kosmickrisp" : "moltenvk");
}

export function getMacOSGraphicsRuntimePaths(bundledAssetsPath: string, vulkanBackend: MacOSVulkanBackend = "moltenvk"): MacOSGraphicsRuntimePaths {
    const runtimePath = path.join(bundledAssetsPath, "runtime");
    const moltenVKPath = path.join(runtimePath, "moltenvk-pr2746");
    const kosmicKrispPath = path.join(runtimePath, "kosmickrisp");
    const fontconfigPath = path.join(runtimePath, "fontconfig");
    const moltenVKLibPath = path.join(moltenVKPath, "lib");
    const moltenVKICDPath = path.join(moltenVKPath, "MoltenVK_icd.json");
    const kosmicKrispLibPath = path.join(kosmicKrispPath, "lib");
    const kosmicKrispICDPath = path.join(kosmicKrispPath, "kosmickrisp_mesa_icd.json");
    const vulkanBackendLibPath = vulkanBackend === "kosmickrisp" ? kosmicKrispLibPath : moltenVKLibPath;
    const vulkanBackendICDPath = vulkanBackend === "kosmickrisp" ? kosmicKrispICDPath : moltenVKICDPath;
    const vulkanBackendRequiredLibraryPath = vulkanBackend === "kosmickrisp" ? path.join(kosmicKrispLibPath, "libvulkan_kosmickrisp.dylib") : path.join(moltenVKLibPath, "libMoltenVK.dylib");
    return {
        vulkanBackend,
        sdl3LibPath: path.join(runtimePath, "sdl3", "lib"),
        mesaZinkLibPath: path.join(runtimePath, "mesa-zink", "lib"),
        vulkanLoaderLibPath: path.join(runtimePath, "vulkan-loader", "lib"),
        vulkanBackendLibPath,
        vulkanBackendICDPath,
        vulkanBackendRequiredLibraryPath,
        moltenVKLibPath,
        moltenVKICDPath,
        kosmicKrispLibPath,
        kosmicKrispICDPath,
        fontconfigConfigDirPath: fontconfigPath,
        fontconfigFilePath: path.join(fontconfigPath, "fonts.conf"),
    };
}

function getMacOSWritableDataPath(options: NativeEngineProcessEnvOptions): string {
    return options.writeDataPath ?? path.resolve(options.assetsPath, "..", "data");
}

function scrubMacOSNativeEngineEnv(env: NodeJS.ProcessEnv) {
    for (const key of [...LEGACY_DRIVER_DISCOVERY_ENV_KEYS, ...MACOS_DIAGNOSTIC_BASELINE_ENV_KEYS]) {
        delete env[key];
    }
}

function isMacOSDiagnosticEngineEnvGateEnabled(env: NodeJS.ProcessEnv) {
    return env[MACOS_DIAGNOSTIC_ENGINE_ENV_GATE] === "1";
}

function isMacOSMinimalFpsWorkaroundEnabled(env: NodeJS.ProcessEnv) {
    return env[MACOS_MINIMAL_FPS_WORKAROUND_ENABLE_ENV] === "1";
}

function applyMacOSMinimalFpsWorkaroundEnv(env: NodeJS.ProcessEnv) {
    if (!isMacOSMinimalFpsWorkaroundEnabled(env)) {
        return env;
    }

    return {
        ...env,
        ZINK_DEBUG: MACOS_MINIMAL_FPS_WORKAROUND_ZINK_DEBUG_VALUE,
    };
}

function applyMacOSDiagnosticEngineEnv(env: NodeJS.ProcessEnv) {
    if (!isMacOSDiagnosticEngineEnvGateEnabled(env)) {
        return env;
    }

    return {
        ...env,
        ZINK_DEBUG: MACOS_MINIMAL_FPS_WORKAROUND_ZINK_DEBUG_VALUE,
    };
}

export function getNativeEngineProcessEnvDiagnostics(env: NodeJS.ProcessEnv): Record<string, string> {
    const keys = [...MACOS_RUNTIME_ENV_KEYS, ...LEGACY_DRIVER_DISCOVERY_ENV_KEYS, ...MACOS_DIAGNOSTIC_BASELINE_ENV_KEYS];
    return Object.fromEntries(keys.map((key) => [key, env[key] ?? "<unset>"]));
}

export function getNativeEngineDataDirDiagnostics(
    env: NodeJS.ProcessEnv,
    pathExists: PathExists = fs.existsSync,
    platform: NodeJS.Platform = process.platform
): Array<Record<string, string | number | boolean>> {
    const springDataDir = env.SPRING_DATADIR ?? "";
    return springDataDir
        .split(path.delimiter)
        .filter(Boolean)
        .map((entry, index) => ({
            index,
            path: entry,
            exists: pathExists(entry),
            hasLuaUI: pathExists(path.join(entry, "LuaUI")),
            hasLuaRules: pathExists(path.join(entry, "LuaRules")),
            hasEngineFonts: pathExists(path.join(entry, "fonts")) || pathExists(path.join(entry, "engine-fonts")),
            hasEngineBinary: pathExists(path.join(entry, getEngineBinaryFileName(platform))),
        }));
}

export function getNativeEngineProcessEnv(options: NativeEngineProcessEnvOptions): NodeJS.ProcessEnv {
    const platform = options.platform ?? process.platform;
    const pathExists = options.pathExists ?? fs.existsSync;
    const env: NodeJS.ProcessEnv = {
        ...(options.baseEnv ?? process.env),
        SPRING_DATADIR: getSpringDataDir(options, pathExists),
    };

    if (platform !== "darwin" || !options.bundledAssetsPath) {
        return env;
    }

    scrubMacOSNativeEngineEnv(env);

    const vulkanBackend = resolveMacOSVulkanBackend(options.bundledAssetsPath, env, pathExists);
    const runtimePaths = getMacOSGraphicsRuntimePaths(options.bundledAssetsPath, vulkanBackend);
    const requiredRuntimeFiles = [
        path.join(runtimePaths.sdl3LibPath, "libSDL3.0.dylib"),
        path.join(runtimePaths.mesaZinkLibPath, "libEGL.1.dylib"),
        path.join(runtimePaths.vulkanLoaderLibPath, "libvulkan.1.dylib"),
        runtimePaths.vulkanBackendRequiredLibraryPath,
        runtimePaths.vulkanBackendICDPath,
        runtimePaths.fontconfigFilePath,
    ];

    if (!requiredRuntimeFiles.every(pathExists)) {
        return env;
    }

    return applyMacOSDiagnosticEngineEnv(
        applyMacOSMinimalFpsWorkaroundEnv({
            ...env,
            [MACOS_VULKAN_BACKEND_ENV]: runtimePaths.vulkanBackend,
            DYLD_LIBRARY_PATH: [runtimePaths.sdl3LibPath, runtimePaths.mesaZinkLibPath, runtimePaths.vulkanLoaderLibPath, runtimePaths.vulkanBackendLibPath].join(path.delimiter),
            VK_DRIVER_FILES: runtimePaths.vulkanBackendICDPath,
            VK_ICD_FILENAMES: runtimePaths.vulkanBackendICDPath,
            MESA_LOADER_DRIVER_OVERRIDE: "zink",
            GALLIUM_DRIVER: "zink",
            EGL_PLATFORM: "cocoa",
            MESA_GL_VERSION_OVERRIDE: "4.6COMPAT",
            MESA_GLSL_VERSION_OVERRIDE: "460",
            FONTCONFIG_FILE: runtimePaths.fontconfigFilePath,
            FONTCONFIG_PATH: runtimePaths.fontconfigConfigDirPath,
            XDG_CACHE_HOME: path.join(getMacOSWritableDataPath(options), "cache"),
        })
    );
}

export function resolveEngineVersionPath(options: NativeEngineResolverOptions): string {
    const pathExists = options.pathExists ?? fs.existsSync;
    const searchPaths = getEngineVersionSearchPaths(options);
    return searchPaths.find((enginePath) => pathExists(enginePath)) ?? searchPaths[0];
}

export function resolveNativeEngineRunner(options: NativeEngineResolverOptions): NativeEngineRunner {
    const platform = options.platform ?? process.platform;
    const binaryFileName = getEngineBinaryFileName(platform);
    const spawnCommand = getEngineSpawnCommand(platform);
    const pathExists = options.pathExists ?? fs.existsSync;
    const searchPaths = getEngineVersionSearchPaths(options);

    if (platform !== "darwin") {
        return {
            enginePath: searchPaths[0],
            binaryFileName,
            spawnCommand,
        };
    }

    const enginePath = searchPaths.find((candidate) => pathExists(path.join(candidate, binaryFileName)));
    if (!enginePath) {
        throw new Error(
            [
                `Native macOS engine ${options.engineVersion} is unavailable.`,
                `Expected ${binaryFileName} at one of: ${searchPaths.join(", ")}.`,
                "The macOS lobby must not use engine_linux64; bundle or install a native macOS engine artifact first.",
            ].join(" ")
        );
    }

    return {
        enginePath,
        binaryFileName,
        spawnCommand,
    };
}

export function resolvePrDownloaderPath(options: NativeEngineResolverOptions): string {
    const platform = options.platform ?? process.platform;
    const binaryFileName = getPrDownloaderBinaryFileName(platform);
    const pathExists = options.pathExists ?? fs.existsSync;
    const searchPaths = getEngineVersionSearchPaths(options);

    if (platform !== "darwin") {
        return path.join(searchPaths[0], binaryFileName);
    }

    const prDownloaderPath = searchPaths.map((candidate) => path.join(candidate, binaryFileName)).find(pathExists);
    if (!prDownloaderPath) {
        throw new Error(
            [
                `Native macOS pr-downloader for engine ${options.engineVersion} is unavailable.`,
                `Expected ${binaryFileName} at one of: ${searchPaths.join(", ")}.`,
                "pr-downloader is part of the native macOS engine artifact and writes downloads to the mutable assets path.",
            ].join(" ")
        );
    }

    return prDownloaderPath;
}
