// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { lua, lauxlib, lualib, to_luastring, to_jsstring } from "fengari";
import { logger } from "@main/utils/logger";

const log = logger("lua-evaluator.ts");

export type LuaValue = number | string | boolean | null | { [key: string]: LuaValue };

/**
 * Evaluate a Lua startbox config script and return the first return value as a JS object.
 *
 * Provides mock globals so map configs can reference:
 * - Game.mapSizeX, Game.mapSizeZ (map dimensions in elmos)
 * - Spring.Utilities.Gametype.isFFA(), isChickens(), isCoop(), isTeams()
 */
export function evaluateLuaStartBoxScript(luaCode: string, mapWidthElmos: number, mapHeightElmos: number): LuaValue {
    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);

    try {
        // Set up mock globals matching Spring engine environment.
        // Provide both camelCase (ZK-style mapside configs) and PascalCase (BAR engine)
        // method names, plus ZK-specific aliases (e.g. isChickens → IsRaptors).
        const globals =
            `Game = { mapSizeX = ${mapWidthElmos}, mapSizeZ = ${mapHeightElmos} }\n` +
            `local _false = function() return false end\n` +
            `local _true = function() return true end\n` +
            `Spring = { Utilities = { Gametype = setmetatable({\n` +
            `  IsFFA = _false, isFFA = _false,\n` +
            `  IsTeams = _true, isTeams = _true,\n` +
            `  Is1v1 = _false, is1v1 = _false,\n` +
            `  IsBigTeams = _false, isBigTeams = _false,\n` +
            `  IsSmallTeams = _false, isSmallTeams = _false,\n` +
            `  IsRaptors = _false, isRaptors = _false, isChickens = _false,\n` +
            `  IsScavengers = _false, isScavengers = _false,\n` +
            `  IsPvE = _false, isPvE = _false,\n` +
            `  IsCoop = _false, isCoop = _false,\n` +
            `  IsSinglePlayer = _false, isSinglePlayer = _false,\n` +
            `  IsSandbox = _false, isSandbox = _false,\n` +
            `}, { __index = function() return _false end }) }}`;

        let result = lauxlib.luaL_dostring(L, to_luastring(globals));
        if (result !== lua.LUA_OK) {
            const err = to_jsstring(lua.lua_tostring(L, -1));
            throw new Error(`Failed to set up Lua globals: ${err}`);
        }

        // Wrap the script in a function to capture the first return value
        const wrapped = `local _f = function()\n${luaCode}\nend\nlocal _layout, _counts = _f()\nreturn _layout`;

        result = lauxlib.luaL_dostring(L, to_luastring(wrapped));
        if (result !== lua.LUA_OK) {
            const err = to_jsstring(lua.lua_tostring(L, -1));
            throw new Error(`Lua evaluation failed: ${err}`);
        }

        if (lua.lua_gettop(L) === 0) {
            throw new Error("Lua script returned no values");
        }

        return luaToJS(L, -1);
    } finally {
        lua.lua_close(L);
    }
}

/** Recursively convert a Lua value on the stack to a JS value. */
function luaToJS(L: lua.lua_State, idx: number): LuaValue {
    const t = lua.lua_type(L, idx);

    switch (t) {
        case lua.LUA_TNUMBER:
            return lua.lua_tonumber(L, idx);
        case lua.LUA_TSTRING:
            return to_jsstring(lua.lua_tostring(L, idx));
        case lua.LUA_TBOOLEAN:
            return lua.lua_toboolean(L, idx);
        case lua.LUA_TNIL:
            return null;
        case lua.LUA_TTABLE: {
            const absIdx = lua.lua_absindex(L, idx);
            const obj: { [key: string]: LuaValue } = {};
            lua.lua_pushnil(L);
            while (lua.lua_next(L, absIdx) !== 0) {
                const key = luaToJS(L, -2);
                const val = luaToJS(L, -1);
                if (key !== null) {
                    obj[String(key)] = val;
                }
                lua.lua_pop(L, 1);
            }
            return obj;
        }
        default:
            return null;
    }
}
