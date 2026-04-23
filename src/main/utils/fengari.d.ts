// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

declare module "fengari" {
    export function to_luastring(str: string): Uint8Array;
    export function to_jsstring(buf: Uint8Array): string;

    export namespace lua {
        type lua_State = object;
        const LUA_TNONE: number;
        const LUA_TNIL: number;
        const LUA_TBOOLEAN: number;
        const LUA_TNUMBER: number;
        const LUA_TSTRING: number;
        const LUA_TTABLE: number;
        const LUA_TFUNCTION: number;
        const LUA_OK: number;

        function lua_type(L: lua_State, index: number): number;
        function lua_gettop(L: lua_State): number;
        function lua_settop(L: lua_State, index: number): void;
        function lua_pop(L: lua_State, n: number): void;
        function lua_absindex(L: lua_State, index: number): number;
        function lua_tonumber(L: lua_State, index: number): number;
        function lua_tostring(L: lua_State, index: number): Uint8Array;
        function lua_toboolean(L: lua_State, index: number): boolean;
        function lua_pushnil(L: lua_State): void;
        function lua_next(L: lua_State, index: number): number;
        function lua_close(L: lua_State): void;
    }

    export namespace lauxlib {
        function luaL_newstate(): lua.lua_State;
        function luaL_dostring(L: lua.lua_State, code: Uint8Array): number;
    }

    export namespace lualib {
        function luaL_openlibs(L: lua.lua_State): void;
    }
}
