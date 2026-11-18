// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// What an engine version says about its own config variables, from `spring-headless --list-config-vars`. Only
// the fields the client uses are described; the engine prints more, and they are kept. Flags are printed as
// numbers, and a value as a number or a string.

import { Type, Static } from "@sinclair/typebox";

const Flag = Type.Number();
const ConfigValue = Type.Union([Type.Number(), Type.String()]);

export const ConfigVarMeta = Type.Object({
    type: Type.String(),
    description: Type.Optional(Type.String()),
    defaultValue: Type.Optional(ConfigValue),
    minimumValue: Type.Optional(ConfigValue),
    maximumValue: Type.Optional(ConfigValue),
    deprecated: Type.Optional(Flag),
    readOnly: Type.Optional(Flag),
});
export type ConfigVarMeta = Static<typeof ConfigVarMeta>;

export const ConfigVars = Type.Record(Type.String(), ConfigVarMeta);
export type ConfigVars = Static<typeof ConfigVars>;

export const isDeprecated = (vars: ConfigVars, key: string) => Object.hasOwn(vars, key) && Boolean(vars[key].deprecated);
