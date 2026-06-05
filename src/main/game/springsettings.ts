// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { WRITE_DATA_PATH } from "@main/config/app";
import { logger } from "@main/utils/logger";

const log = logger("main/game/springsettings.ts");

const SPRINGSETTINGS_PATH = path.join(WRITE_DATA_PATH, "springsettings.cfg");

// Default engine settings for BAR, sourced from:
// https://github.com/beyond-all-reason/BYAR-Chobby/blob/master/dist_cfg/config.json
const BAR_SPRINGSETTINGS_DEFAULTS: Record<string, string | number> = {
    AdvUnitShading: 1,
    AdvMapShading: 1,
    AdvSky: 0,
    AllowDeferredMapRendering: 1,
    AllowDeferredModelRendering: 1,
    BuildWarnings: 0,
    BumpWaterBlurReflection: 1,
    BumpWaterDepthBits: 16,
    BumpWaterShoreWaves: 1,
    BumpWaterTexSizeReflection: 1024,
    CamTimeExponent: 4.0,
    CamTimeFactor: 1.0,
    CrossAlpha: 0,
    CubeTexSpecularExponent: 100,
    CubeTexGenerateMipMaps: 1,
    CubeTexSizeReflection: 1024,
    DisplayDebugPrefixConsole: 0,
    DualScreenMiniMapOnLeft: 1,
    FPSFOV: 90,
    FeatureDrawDistance: 10000,
    FeatureFadeDistance: 10000,
    ForceDisableShaders: 0,
    Fullscreen: 0,
    FullscreenEdgeMove: 1,
    GrassDetail: 0,
    GroundDecals: 2,
    GroundDetail: 200,
    GroundScarAlphaFade: 1,
    HangTimeout: 30,
    HardwareCursor: 1,
    InitialNetworkTimeout: 0,
    LODScale: 1.0,
    LODScaleReflection: 1.0,
    LODScaleRefraction: 1.0,
    LODScaleShadow: 1.0,
    LuaGarbageCollectionMemLoadMult: 2.0,
    LogFlush: 0,
    LuaShaders: 1,
    LoadingMT: 0,
    MaxParticles: 20000,
    MaxSounds: 256,
    MaximumTransmissionUnit: 0,
    MaxTextureAtlasSizeX: 8192,
    MaxTextureAtlasSizeZ: 8192,
    MiddleClickScrollSpeed: -0.005,
    MinimapOnLeft: 1,
    MouseDragScrollThreshold: 0.3,
    MoveWarnings: 0,
    MSAA: 1,
    MSAALevel: 4,
    NormalMapping: 1,
    ReconnectTimeout: 0,
    Roam: 1,
    ReflectiveWater: 3,
    ScrollWheelSpeed: -20,
    Shadows: 1,
    ShadowMapSize: 2048,
    ShowClock: 0,
    ShowFps: 0,
    ShowSpeed: 0,
    SmoothLines: 1,
    TreeRadius: 1000,
    UnitIconDist: 160,
    UnitLodDist: 999999,
    UnitIconsAsUI: 1,
    UnitIconScaleUI: 1.05,
    UnitIconFadeVanish: 2700,
    UnitIconFadeStart: 3000,
    UnitIconFadeAmount: 0.1,
    UsePBO: 1,
    Water: 4,
    WindowedEdgeMove: 1,
    WindowPosX: 0,
    WindowPosY: 0,
    snd_general: 100,
    snd_volmaster: 30,
    snd_volmusic: 30,
    snd_airAbsorption: 0.35,
    ui_opacity: 0.6,
    UseNetMessageSmoothingBuffer: 0,
    NetworkLossFactor: 2,
    MaxDynamicModelLights: 0,
    LinkOutgoingBandwidth: 262144,
    LinkIncomingSustainedBandwidth: 1048576,
    LinkIncomingPeakBandwidth: 1048576,
    LinkIncomingMaxPacketRate: 2048,
};

function readSettings(filePath: string): Map<string, string> {
    const settings = new Map<string, string>();
    let fileContent = "";
    try {
        fileContent = fs.readFileSync(filePath, "utf-8");
    } catch {
        return settings;
    }
    for (const line of fileContent.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        settings.set(trimmed.slice(0, eqIndex).trim(), trimmed.slice(eqIndex + 1).trim());
    }
    return settings;
}

function writeSettings(settings: Map<string, string>, filePath: string): void {
    const lines: string[] = [];
    for (const [key, value] of settings) {
        lines.push(`${key} = ${value}`);
    }
    fs.writeFileSync(filePath, lines.join(os.EOL) + os.EOL, "utf-8");
}

export function applyDefaultSpringsettings(): void {
    try {
        fs.mkdirSync(path.dirname(SPRINGSETTINGS_PATH), { recursive: true });
        const settings = readSettings(SPRINGSETTINGS_PATH);
        let changed = false;
        for (const [key, value] of Object.entries(BAR_SPRINGSETTINGS_DEFAULTS)) {
            if (!settings.has(key)) {
                settings.set(key, String(value));
                changed = true;
            }
        }
        if (changed) {
            writeSettings(settings, SPRINGSETTINGS_PATH);
            log.info("Applied default springsettings");
        }
    } catch (err) {
        log.error(`Failed to apply default springsettings: ${err}`);
    }
}
