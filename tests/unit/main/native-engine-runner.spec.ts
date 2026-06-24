// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "path";
import fs from "fs";
import os from "os";
import { describe, expect, it } from "vitest";

import {
    getEngineRootSearchPaths,
    getEngineVersionSearchPaths,
    getMacOSLuaUIOverlayPath,
    getMacOSGraphicsRuntimePaths,
    getNativeEngineDataDirDiagnostics,
    getNativeEngineProcessEnvDiagnostics,
    getNativeEngineProcessEnv,
    MACOS_DIAGNOSTIC_ENGINE_ENV_GATE,
    MACOS_DIAGNOSTIC_ZINK_DEBUG_VALUE,
    MACOS_KOSMICKRISP_BACKEND_MARKER,
    MACOS_MINIMAL_FPS_WORKAROUND_DISABLE_ENV,
    MACOS_MINIMAL_FPS_WORKAROUND_ENABLE_ENV,
    MACOS_MINIMAL_FPS_WORKAROUND_ZINK_DEBUG_VALUE,
    MACOS_NATIVE_ENGINE_DATA_DIR_DIAGNOSTIC_PROBE,
    MACOS_NATIVE_ENGINE_ENV_DIAGNOSTIC_PROBE,
    MACOS_VULKAN_BACKEND_ENV,
    getPrDownloaderBinaryFileName,
    getSpringDataDir,
    resolveNativeEngineRunner,
    resolvePrDownloaderPath,
    syncMacOSLuaUIOverlayToWritableDataDir,
} from "@main/config/native-engine-runner";

const assetsPath = "/Users/test/Library/Application Support/BeyondAllReason/assets";
const writeDataPath = "/Users/test/Library/Application Support/BeyondAllReason/data";
const bundledAssetsPath = "/Applications/BAR.app/Contents/Resources/bundled-assets";
const bundledEnginePath = path.join(bundledAssetsPath, "engine", "2025.06.21");

describe("native engine runner contract", () => {
    it("searches mutable assets before immutable bundled assets", () => {
        expect(getEngineRootSearchPaths({ assetsPath, bundledAssetsPath })).toEqual([path.join(assetsPath, "engine"), path.join(bundledAssetsPath, "engine")]);
        expect(getEngineVersionSearchPaths({ engineVersion: "2025.06.21", assetsPath, bundledAssetsPath })).toEqual([
            path.join(assetsPath, "engine", "2025.06.21"),
            path.join(bundledAssetsPath, "engine", "2025.06.21"),
        ]);
    });

    it("keeps the native macOS engine binary named spring", () => {
        const bundledSpringPath = path.join(bundledAssetsPath, "engine", "2025.06.21", "spring");
        const runner = resolveNativeEngineRunner({
            engineVersion: "2025.06.21",
            assetsPath,
            bundledAssetsPath,
            platform: "darwin",
            pathExists: (filePath) => filePath === bundledSpringPath,
        });

        expect(runner).toEqual({
            enginePath: path.dirname(bundledSpringPath),
            binaryFileName: "spring",
            spawnCommand: "./spring",
        });
    });

    it("treats pr-downloader as part of the native macOS engine artifact", () => {
        const bundledPrDownloaderPath = path.join(bundledAssetsPath, "engine", "2025.06.21", "pr-downloader");

        expect(getPrDownloaderBinaryFileName("darwin")).toBe("pr-downloader");
        expect(
            resolvePrDownloaderPath({
                engineVersion: "2025.06.21",
                assetsPath,
                bundledAssetsPath,
                platform: "darwin",
                pathExists: (filePath) => filePath === bundledPrDownloaderPath,
            })
        ).toBe(bundledPrDownloaderPath);
    });

    it("refuses to silently fall back when the macOS engine is unavailable", () => {
        expect(() =>
            resolveNativeEngineRunner({
                engineVersion: "2025.06.21",
                assetsPath,
                bundledAssetsPath,
                platform: "darwin",
                pathExists: () => false,
            })
        ).toThrow(/must not use engine_linux64/);
    });

    it("passes mutable assets, immutable bundled assets, and the selected engine path through SPRING_DATADIR", () => {
        expect(getSpringDataDir({ assetsPath, bundledAssetsPath, enginePath: bundledEnginePath }, (filePath) => filePath === bundledAssetsPath || filePath === bundledEnginePath)).toBe(
            `${assetsPath}${path.delimiter}${bundledAssetsPath}${path.delimiter}${bundledEnginePath}`
        );
    });

    it("can keep bundled overlay content out of SPRING_DATADIR while still exposing the selected engine path", () => {
        expect(
            getSpringDataDir(
                {
                    assetsPath,
                    bundledAssetsPath,
                    enginePath: bundledEnginePath,
                    includeBundledAssetsInSpringDataDir: false,
                },
                (filePath) => filePath === bundledAssetsPath || filePath === bundledEnginePath
            )
        ).toBe(`${assetsPath}${path.delimiter}${bundledEnginePath}`);
    });

    it("can expose bundled engine support data without exposing bundled Lua overlays", () => {
        const engineFontsPath = path.join(bundledAssetsPath, "engine-fonts");
        const fontsPath = path.join(bundledAssetsPath, "fonts");

        expect(
            getSpringDataDir(
                {
                    assetsPath,
                    bundledAssetsPath,
                    enginePath: bundledEnginePath,
                    includeBundledAssetsInSpringDataDir: false,
                    includeBundledEngineSupportInSpringDataDir: true,
                },
                (filePath) => [bundledAssetsPath, engineFontsPath, fontsPath, bundledEnginePath].includes(filePath)
            )
        ).toBe(`${assetsPath}${path.delimiter}${engineFontsPath}${path.delimiter}${fontsPath}${path.delimiter}${bundledEnginePath}`);
    });

    it("can expose only the bundled macOS LuaUI overlay for Chobby multiplayer", () => {
        const overlayPath = getMacOSLuaUIOverlayPath(bundledAssetsPath);
        const engineFontsPath = path.join(bundledAssetsPath, "engine-fonts");
        const fontsPath = path.join(bundledAssetsPath, "fonts");

        expect(
            getSpringDataDir(
                {
                    assetsPath,
                    bundledAssetsPath,
                    enginePath: bundledEnginePath,
                    includeBundledAssetsInSpringDataDir: false,
                    includeBundledEngineSupportInSpringDataDir: true,
                    includeBundledMacOSLuaUIOverlayInSpringDataDir: true,
                },
                (filePath) => [bundledAssetsPath, overlayPath, path.join(overlayPath, "LuaUI"), engineFontsPath, fontsPath, bundledEnginePath].includes(filePath)
            )
        ).toBe(`${overlayPath}${path.delimiter}${assetsPath}${path.delimiter}${engineFontsPath}${path.delimiter}${fontsPath}${path.delimiter}${bundledEnginePath}`);
    });

    it("can materialize the bundled macOS LuaUI overlay into the writable data dir", async () => {
        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "bar-luaui-overlay-"));
        try {
            const localBundledAssetsPath = path.join(tempDir, "BAR.app", "Contents", "Resources", "bundled-assets");
            const localWriteDataPath = path.join(tempDir, "data");
            const overlayWidgetPath = path.join(localBundledAssetsPath, "macos-luaui-overlay", "LuaUI", "Widgets", "gui_unit_stats.lua");
            const overlayShaderPath = path.join(localBundledAssetsPath, "macos-luaui-overlay", "LuaUI", "Shaders", "HealthbarsGL4_NoGS.vert.glsl");
            await fs.promises.mkdir(path.dirname(overlayWidgetPath), { recursive: true });
            await fs.promises.mkdir(path.dirname(overlayShaderPath), { recursive: true });
            await fs.promises.writeFile(overlayWidgetPath, "return true\n", "utf-8");
            await fs.promises.writeFile(overlayShaderPath, "// shader\n", "utf-8");

            const result = await syncMacOSLuaUIOverlayToWritableDataDir({
                bundledAssetsPath: localBundledAssetsPath,
                writeDataPath: localWriteDataPath,
                platform: "darwin",
            });

            expect(result).toEqual({
                synced: true,
                sourcePath: path.join(localBundledAssetsPath, "macos-luaui-overlay", "LuaUI"),
                destinationPath: path.join(localWriteDataPath, "LuaUI"),
            });
            await expect(fs.promises.readFile(path.join(localWriteDataPath, "LuaUI", "Widgets", "gui_unit_stats.lua"), "utf-8")).resolves.toBe("return true\n");
            await expect(fs.promises.readFile(path.join(localWriteDataPath, "LuaUI", "Shaders", "HealthbarsGL4_NoGS.vert.glsl"), "utf-8")).resolves.toBe("// shader\n");
        } finally {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
    });

    it("adds the bundled macOS Mesa/Zink/MoltenVK runtime environment without the minimal-FPS fallback by default", () => {
        const runtimePaths = getMacOSGraphicsRuntimePaths(bundledAssetsPath);
        const requiredFiles = new Set([
            bundledAssetsPath,
            bundledEnginePath,
            path.join(runtimePaths.sdl3LibPath, "libSDL3.0.dylib"),
            path.join(runtimePaths.mesaZinkLibPath, "libEGL.1.dylib"),
            path.join(runtimePaths.vulkanLoaderLibPath, "libvulkan.1.dylib"),
            path.join(runtimePaths.moltenVKLibPath, "libMoltenVK.dylib"),
            runtimePaths.moltenVKICDPath,
            runtimePaths.fontconfigFilePath,
        ]);

        const env = getNativeEngineProcessEnv({
            assetsPath,
            bundledAssetsPath,
            enginePath: bundledEnginePath,
            writeDataPath,
            platform: "darwin",
            baseEnv: {
                DYLD_LIBRARY_PATH: "/tmp/old-dyld",
                DYLD_FALLBACK_LIBRARY_PATH: "/tmp/fallback",
                VK_ADD_DRIVER_FILES: "/tmp/other-driver.json",
                ZINK_DEBUG: "flushsync",
                MESA_GLTHREAD: "0",
                GALLIUM_THREAD: "0",
            },
            pathExists: (filePath) => requiredFiles.has(filePath),
        });

        expect(env.SPRING_DATADIR).toBe(`${assetsPath}${path.delimiter}${bundledAssetsPath}${path.delimiter}${bundledEnginePath}`);
        expect(env[MACOS_VULKAN_BACKEND_ENV]).toBe("moltenvk");
        expect(env.DYLD_LIBRARY_PATH).toBe([runtimePaths.sdl3LibPath, runtimePaths.mesaZinkLibPath, runtimePaths.vulkanLoaderLibPath, runtimePaths.moltenVKLibPath].join(path.delimiter));
        expect(env.VK_DRIVER_FILES).toBe(runtimePaths.moltenVKICDPath);
        expect(env.VK_ICD_FILENAMES).toBe(runtimePaths.moltenVKICDPath);
        expect(env.MESA_LOADER_DRIVER_OVERRIDE).toBe("zink");
        expect(env.GALLIUM_DRIVER).toBe("zink");
        expect(env.EGL_PLATFORM).toBe("cocoa");
        expect(env.MESA_GL_VERSION_OVERRIDE).toBe("4.6COMPAT");
        expect(env.MESA_GLSL_VERSION_OVERRIDE).toBe("460");
        expect(env.FONTCONFIG_FILE).toBe(runtimePaths.fontconfigFilePath);
        expect(env.FONTCONFIG_PATH).toBe(runtimePaths.fontconfigConfigDirPath);
        expect(env.XDG_CACHE_HOME).toBe(path.join(writeDataPath, "cache"));
        expect(env.VK_ADD_DRIVER_FILES).toBeUndefined();
        expect(env.DYLD_FALLBACK_LIBRARY_PATH).toBeUndefined();
        expect(env.ZINK_DEBUG).toBeUndefined();
        expect(env.MESA_GLTHREAD).toBeUndefined();
        expect(env.GALLIUM_THREAD).toBeUndefined();
    });

    it("keeps Chobby multiplayer's SPRING_DATADIR on official content plus bundled engine support and the exact engine", () => {
        const runtimePaths = getMacOSGraphicsRuntimePaths(bundledAssetsPath);
        const engineFontsPath = path.join(bundledAssetsPath, "engine-fonts");
        const fontsPath = path.join(bundledAssetsPath, "fonts");
        const overlayPath = getMacOSLuaUIOverlayPath(bundledAssetsPath);
        const requiredFiles = new Set([
            bundledAssetsPath,
            overlayPath,
            path.join(overlayPath, "LuaUI"),
            engineFontsPath,
            fontsPath,
            bundledEnginePath,
            path.join(runtimePaths.sdl3LibPath, "libSDL3.0.dylib"),
            path.join(runtimePaths.mesaZinkLibPath, "libEGL.1.dylib"),
            path.join(runtimePaths.vulkanLoaderLibPath, "libvulkan.1.dylib"),
            path.join(runtimePaths.moltenVKLibPath, "libMoltenVK.dylib"),
            runtimePaths.moltenVKICDPath,
            runtimePaths.fontconfigFilePath,
        ]);

        const env = getNativeEngineProcessEnv({
            assetsPath,
            bundledAssetsPath,
            enginePath: bundledEnginePath,
            includeBundledAssetsInSpringDataDir: false,
            includeBundledEngineSupportInSpringDataDir: true,
            includeBundledMacOSLuaUIOverlayInSpringDataDir: true,
            writeDataPath,
            platform: "darwin",
            baseEnv: {},
            pathExists: (filePath) => requiredFiles.has(filePath),
        });

        expect(env.SPRING_DATADIR).toBe(`${overlayPath}${path.delimiter}${assetsPath}${path.delimiter}${engineFontsPath}${path.delimiter}${fontsPath}${path.delimiter}${bundledEnginePath}`);
        expect(env[MACOS_VULKAN_BACKEND_ENV]).toBe("moltenvk");
        expect(env.ZINK_DEBUG).toBeUndefined();
    });

    it("can select the bundled macOS Mesa/Zink/KosmicKrisp runtime by app marker", () => {
        const runtimePaths = getMacOSGraphicsRuntimePaths(bundledAssetsPath, "kosmickrisp");
        const kosmicKrispMarkerPath = path.join(path.dirname(bundledAssetsPath), MACOS_KOSMICKRISP_BACKEND_MARKER);
        const requiredFiles = new Set([
            bundledAssetsPath,
            bundledEnginePath,
            path.join(runtimePaths.sdl3LibPath, "libSDL3.0.dylib"),
            path.join(runtimePaths.mesaZinkLibPath, "libEGL.1.dylib"),
            path.join(runtimePaths.vulkanLoaderLibPath, "libvulkan.1.dylib"),
            path.join(runtimePaths.kosmicKrispLibPath, "libvulkan_kosmickrisp.dylib"),
            runtimePaths.kosmicKrispICDPath,
            runtimePaths.fontconfigFilePath,
            kosmicKrispMarkerPath,
        ]);

        const env = getNativeEngineProcessEnv({
            assetsPath,
            bundledAssetsPath,
            enginePath: bundledEnginePath,
            writeDataPath,
            platform: "darwin",
            baseEnv: {},
            pathExists: (filePath) => requiredFiles.has(filePath),
        });

        expect(env[MACOS_VULKAN_BACKEND_ENV]).toBe("kosmickrisp");
        expect(env.DYLD_LIBRARY_PATH).toBe([runtimePaths.sdl3LibPath, runtimePaths.mesaZinkLibPath, runtimePaths.vulkanLoaderLibPath, runtimePaths.kosmicKrispLibPath].join(path.delimiter));
        expect(env.VK_DRIVER_FILES).toBe(runtimePaths.kosmicKrispICDPath);
        expect(env.VK_ICD_FILENAMES).toBe(runtimePaths.kosmicKrispICDPath);
    });

    it("can explicitly enable the minimal-FPS fallback for backend A/B diagnostics", () => {
        const runtimePaths = getMacOSGraphicsRuntimePaths(bundledAssetsPath);
        const requiredFiles = new Set([
            bundledAssetsPath,
            bundledEnginePath,
            path.join(runtimePaths.sdl3LibPath, "libSDL3.0.dylib"),
            path.join(runtimePaths.mesaZinkLibPath, "libEGL.1.dylib"),
            path.join(runtimePaths.vulkanLoaderLibPath, "libvulkan.1.dylib"),
            path.join(runtimePaths.moltenVKLibPath, "libMoltenVK.dylib"),
            runtimePaths.moltenVKICDPath,
            runtimePaths.fontconfigFilePath,
        ]);

        const env = getNativeEngineProcessEnv({
            assetsPath,
            bundledAssetsPath,
            enginePath: bundledEnginePath,
            writeDataPath,
            platform: "darwin",
            baseEnv: {
                [MACOS_MINIMAL_FPS_WORKAROUND_ENABLE_ENV]: "1",
                ZINK_DEBUG: "flushsync",
                MESA_GLTHREAD: "0",
                GALLIUM_THREAD: "0",
            },
            pathExists: (filePath) => requiredFiles.has(filePath),
        });

        expect(env[MACOS_MINIMAL_FPS_WORKAROUND_ENABLE_ENV]).toBe("1");
        expect(env.ZINK_DEBUG).toBe(MACOS_MINIMAL_FPS_WORKAROUND_ZINK_DEBUG_VALUE);
        expect(env.MESA_GLTHREAD).toBeUndefined();
        expect(env.GALLIUM_THREAD).toBeUndefined();
    });

    it("keeps the explicit macOS diagnostic gate compatible with the minimal-FPS workaround", () => {
        const runtimePaths = getMacOSGraphicsRuntimePaths(bundledAssetsPath);
        const requiredFiles = new Set([
            bundledAssetsPath,
            bundledEnginePath,
            path.join(runtimePaths.sdl3LibPath, "libSDL3.0.dylib"),
            path.join(runtimePaths.mesaZinkLibPath, "libEGL.1.dylib"),
            path.join(runtimePaths.vulkanLoaderLibPath, "libvulkan.1.dylib"),
            path.join(runtimePaths.moltenVKLibPath, "libMoltenVK.dylib"),
            runtimePaths.moltenVKICDPath,
            runtimePaths.fontconfigFilePath,
        ]);

        const env = getNativeEngineProcessEnv({
            assetsPath,
            bundledAssetsPath,
            enginePath: bundledEnginePath,
            writeDataPath,
            platform: "darwin",
            baseEnv: {
                [MACOS_DIAGNOSTIC_ENGINE_ENV_GATE]: "1",
                ZINK_DEBUG: "flushsync",
                MESA_GLTHREAD: "0",
                GALLIUM_THREAD: "0",
            },
            pathExists: (filePath) => requiredFiles.has(filePath),
        });

        expect(env[MACOS_DIAGNOSTIC_ENGINE_ENV_GATE]).toBe("1");
        expect(env.ZINK_DEBUG).toBe(MACOS_MINIMAL_FPS_WORKAROUND_ZINK_DEBUG_VALUE);
        expect(env.MESA_GLTHREAD).toBeUndefined();
        expect(env.GALLIUM_THREAD).toBeUndefined();
    });

    it("does not treat non-1 opt-in values as enabling the minimal-FPS fallback", () => {
        const runtimePaths = getMacOSGraphicsRuntimePaths(bundledAssetsPath);
        const requiredFiles = new Set([
            bundledAssetsPath,
            bundledEnginePath,
            path.join(runtimePaths.sdl3LibPath, "libSDL3.0.dylib"),
            path.join(runtimePaths.mesaZinkLibPath, "libEGL.1.dylib"),
            path.join(runtimePaths.vulkanLoaderLibPath, "libvulkan.1.dylib"),
            path.join(runtimePaths.moltenVKLibPath, "libMoltenVK.dylib"),
            runtimePaths.moltenVKICDPath,
            runtimePaths.fontconfigFilePath,
        ]);

        const env = getNativeEngineProcessEnv({
            assetsPath,
            bundledAssetsPath,
            enginePath: bundledEnginePath,
            writeDataPath,
            platform: "darwin",
            baseEnv: {
                [MACOS_MINIMAL_FPS_WORKAROUND_ENABLE_ENV]: "true",
                ZINK_DEBUG: "flushsync",
            },
            pathExists: (filePath) => requiredFiles.has(filePath),
        });

        expect(env[MACOS_MINIMAL_FPS_WORKAROUND_ENABLE_ENV]).toBe("true");
        expect(env.ZINK_DEBUG).toBeUndefined();
    });

    it("formats the temporary macOS native engine env diagnostic probe", () => {
        expect(MACOS_NATIVE_ENGINE_ENV_DIAGNOSTIC_PROBE).toBe("MACOS_DIAGNOSTIC_PROBE native-engine-env");
        expect(
            getNativeEngineProcessEnvDiagnostics({
                [MACOS_DIAGNOSTIC_ENGINE_ENV_GATE]: "1",
                [MACOS_MINIMAL_FPS_WORKAROUND_DISABLE_ENV]: "1",
                SPRING_DATADIR: "/tmp/data",
                MESA_LOADER_DRIVER_OVERRIDE: "zink",
                ZINK_DEBUG: MACOS_DIAGNOSTIC_ZINK_DEBUG_VALUE,
            })
        ).toEqual(
            expect.objectContaining({
                [MACOS_DIAGNOSTIC_ENGINE_ENV_GATE]: "1",
                [MACOS_MINIMAL_FPS_WORKAROUND_DISABLE_ENV]: "1",
                SPRING_DATADIR: "/tmp/data",
                MESA_LOADER_DRIVER_OVERRIDE: "zink",
                ZINK_DEBUG: MACOS_DIAGNOSTIC_ZINK_DEBUG_VALUE,
                MESA_GLTHREAD: "<unset>",
                GALLIUM_THREAD: "<unset>",
            })
        );
    });

    it("formats the temporary macOS native engine data-dir diagnostic probe", () => {
        const overlayPath = getMacOSLuaUIOverlayPath(bundledAssetsPath);
        const springDataDir = [overlayPath, assetsPath, bundledEnginePath].join(path.delimiter);

        expect(MACOS_NATIVE_ENGINE_DATA_DIR_DIAGNOSTIC_PROBE).toBe("MACOS_DIAGNOSTIC_PROBE native-engine-data-dirs");
        expect(
            getNativeEngineDataDirDiagnostics(
                {
                    SPRING_DATADIR: springDataDir,
                },
                (filePath) => [overlayPath, path.join(overlayPath, "LuaUI"), assetsPath, bundledEnginePath, path.join(bundledEnginePath, "spring")].includes(filePath),
                "darwin"
            )
        ).toEqual([
            expect.objectContaining({
                index: 0,
                path: overlayPath,
                exists: true,
                hasLuaUI: true,
                hasLuaRules: false,
                hasEngineBinary: false,
            }),
            expect.objectContaining({
                index: 1,
                path: assetsPath,
                exists: true,
                hasLuaUI: false,
            }),
            expect.objectContaining({
                index: 2,
                path: bundledEnginePath,
                exists: true,
                hasEngineBinary: true,
            }),
        ]);
    });

    it("preserves the existing Linux engine path and SPRING_DATADIR shape", () => {
        const runner = resolveNativeEngineRunner({
            engineVersion: "2025.06.21",
            assetsPath,
            platform: "linux",
            pathExists: () => false,
        });

        expect(runner).toEqual({
            enginePath: path.join(assetsPath, "engine", "2025.06.21"),
            binaryFileName: "spring",
            spawnCommand: "./spring",
        });
        expect(getSpringDataDir({ assetsPath }, () => false)).toBe(assetsPath);
    });
});
