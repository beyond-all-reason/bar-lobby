// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Engine settings the user changed from the defaults: the keys and values of springsettings.cfg, kept by the
// client so they survive every launch and can be synced. A key that is missing means "use the default".

import { Type, Static } from "@sinclair/typebox";

// The newest format this client reads. A file with a higher version was written by a newer client, maybe on
// another machine, and is left alone rather than overwritten.
export const ENGINE_SETTINGS_FORMAT_VERSION = 1;

// springsettings.cfg has one `Key = Value` per line, trimmed, with no quoting or escaping, and a line starting
// with `#` is a comment. So a key holds no `=`, `#` or line break, and neither holds surrounding space. A
// value may be empty.
export const ENGINE_SETTING_KEY_PATTERN = "^[^\\s=#](?:[^=#\\r\\n]*[^\\s=#])?$";
export const ENGINE_SETTING_VALUE_PATTERN = "^(?:\\S(?:[^\\r\\n]*\\S)?)?$";

const keyPattern = new RegExp(ENGINE_SETTING_KEY_PATTERN);
const valuePattern = new RegExp(ENGINE_SETTING_VALUE_PATTERN);

export const isEngineSettingKey = (key: string) => keyPattern.test(key);
export const isEngineSettingValue = (value: string) => valuePattern.test(value);

export const EngineSettingValues = Type.Record(Type.String(), Type.String({ pattern: ENGINE_SETTING_VALUE_PATTERN }), {
    propertyNames: { type: "string", pattern: ENGINE_SETTING_KEY_PATTERN },
});
export type EngineSettingValues = Static<typeof EngineSettingValues>;

// Extra properties are allowed and kept on rewrite, so fields a newer client adds survive an older one.
export const EngineSettingsFile = Type.Object({
    formatVersion: Type.Integer({ minimum: 1 }),
    values: EngineSettingValues,
});
export type EngineSettingsFile = Static<typeof EngineSettingsFile>;

// What the client last wrote to the engine's springsettings.cfg, and for whom. The file is compared with it
// to tell what the game, or a hand edit, changed since.
export const AppliedSnapshot = Type.Object({
    formatVersion: Type.Integer({ minimum: 1 }),
    profileId: Type.String({ minLength: 1 }),
    engineVersion: Type.String({ minLength: 1 }),
    // The game process, once it has started. While it is alive the file is still the game's to change.
    pid: Type.Optional(Type.Integer({ minimum: 1 })),
    values: EngineSettingValues,
});
export type AppliedSnapshot = Static<typeof AppliedSnapshot>;
