// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { isDeviceKey } from "@shared/engine-settings/device-keys";
import { isEngineSettingKey, isEngineSettingValue } from "@shared/engine-settings/engine-settings";
import { isGameOwnedKey } from "@shared/engine-settings/game-owned-keys";

describe("engine setting keys and values", () => {
    it.each(["snd_volmaster", "XResolution", "a", "Key With Spaces", "music_loadscreen_track"])("accepts the key %j", (key) => {
        expect(isEngineSettingKey(key)).toBe(true);
    });

    it.each(["", " lead", "trail ", "a=b", "#comment", "a#b", "line\nbreak", "cr\rreturn"])("refuses the key %j", (key) => {
        expect(isEngineSettingKey(key)).toBe(false);
    });

    it.each(["", "0", "0.35 0.72 0.03 0.04", "a=b", "#fff", "music/original/loading/leon devereux - surveillance protocol.ogg"])("accepts the value %j", (value) => {
        expect(isEngineSettingValue(value)).toBe(true);
    });

    it.each([" lead", "trail ", "line\nbreak", "cr\rreturn", " "])("refuses the value %j", (value) => {
        expect(isEngineSettingValue(value)).toBe(false);
    });
});

describe("device keys", () => {
    it.each([
        "XResolution",
        "YResolutionWindowed",
        "WindowPosX",
        "WindowState",
        "Fullscreen",
        "WindowBorderless",
        "VSync",
        "VSyncGame",
        "SelectedScreenMode",
        "FontSize",
        "SmallFontSize",
        "FontOutlineWidth",
        "SmallFontOutlineWidth",
        "MSAALevel",
        "Shadows",
        "ShadowMapSize",
        "Water",
        "ReflectiveWater",
        "BumpWaterReflection",
        "GrassDetail",
        "GroundDetail",
        "GroundDecals",
        "TreeRadius",
        "MaxParticles",
        "MaxNanoParticles",
        "AdvMapShading",
        "AdvSky",
        "LODScaleShadow",
        "CubeTexSizeReflection",
        "MaxTextureAtlasSizeX",
        "FeatureDrawDistance",
        "UnitLodDist",
        "MaxDynamicMapLights",
        "AllowDeferredMapRendering",
        "NormalMapping",
        "UsePBO",
        "ForceDisableShaders",
        "graphicsPreset",
        "snd_device",
        "MaxSounds",
    ])("keeps %s on the device", (key) => {
        expect(isDeviceKey(key)).toBe(true);
    });

    // Including keys nobody recognises: syncing too much is the safe side.
    it.each(["snd_volmaster", "snd_volmusic", "ui_scale", "version", "KeybindingFile", "CamMode", "WaterLevel", "MyWater", "FontFile", "SmallFontOutlineWeight", "SomeKeyNobodyKnows"])(
        "syncs %s",
        (key) => {
            expect(isDeviceKey(key)).toBe(false);
        }
    );
});

describe("game-owned keys", () => {
    it.each(["snd_volbattle", "music_loadscreen_track", "MouseDragSelectionThreshold", "MouseDragBoxCommandThreshold", "MouseDragCircleCommandThreshold", "MouseDragFrontCommandThreshold"])(
        "leaves %s to the game",
        (key) => {
            expect(isGameOwnedKey(key)).toBe(true);
        }
    );

    // The player's own choices beside them: the battle volume option, and the drag scroll toggle.
    it.each(["snd_volbattle_options", "snd_volmaster", "music", "MouseDragScrollThreshold", "XResolution"])("keeps %s for the client", (key) => {
        expect(isGameOwnedKey(key)).toBe(false);
    });
});
