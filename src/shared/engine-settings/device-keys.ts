// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Settings that belong to this machine rather than to the player: its display, its GPU's limits and its
// sound device. They are kept on the device and never synced. Every other key is synced, including ones the
// client doesn't recognise.
export const DEVICE_KEY_PATTERNS: readonly RegExp[] = [
    // Window and display
    /^[XY]Resolution/,
    /^WindowPos/,
    /^WindowState$/,
    /^Fullscreen$/,
    /^WindowBorderless$/,
    /^VSync/,
    /^SelectedScreenMode$/,
    // The game sizes fonts to the display.
    /^(Small)?FontSize$/,
    /^(Small)?FontOutlineWidth$/,
    // Graphics quality
    /^MSAA/,
    /^Shadow/,
    /^Water$/,
    /^ReflectiveWater$/,
    /^BumpWater/,
    /^GrassDetail$/,
    /^GroundDetail$/,
    /^GroundDecals$/,
    /^TreeRadius$/,
    /^Max\w*Particles$/,
    /^Adv\w*Shading$/,
    /^AdvSky$/,
    /^LODScale/,
    /^CubeTex/,
    /^MaxTextureAtlasSize/,
    /^Feature\w*Distance$/,
    /^UnitLodDist$/,
    /^MaxDynamic\w*Lights$/,
    /^AllowDeferred/,
    /^NormalMapping$/,
    /^UsePBO$/,
    /^ForceDisableShaders$/,
    /^graphicsPreset$/,
    // Audio
    /^snd_device$/,
    /^MaxSounds$/,
];

export const isDeviceKey = (key: string) => DEVICE_KEY_PATTERNS.some((pattern) => pattern.test(key));
