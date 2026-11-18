// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { EngineSettingValues } from "./engine-settings";

// Where an override is kept: synced with the player's other machines, or only on this one.
export type EngineSettingScope = "synced" | "device";

export type EngineSettingsStatus = { usable: true } | { usable: false; problem: string };

// Every reason main can give for not reading or changing the engine settings.
export type EngineSettingsFailure =
    // A master file can't be used, such as one written by a newer client or only half synced. Nothing changes
    // until it is fixed or removed.
    | "settings_unusable"
    // A key or value that can't be written to springsettings.cfg, or a key the game sets for itself.
    | "invalid_setting"
    | "settings_failed";

/**
 * The engine settings as the renderer sees them. A key's value is its override if it has one, else the
 * client's default, else the engine's own. Values are springsettings.cfg strings, compared exactly.
 */
export type EngineSettingsView = {
    status: EngineSettingsStatus;
    overrides: Record<string, { value: string; scope: EngineSettingScope }>;
    clientDefaults: EngineSettingValues;
    // The default engine's compiled-in defaults, numbers printed as JavaScript prints them. Empty if they can't
    // be listed.
    engineDefaults: EngineSettingValues;
};
