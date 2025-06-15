// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { LuaOptionSection } from "@main/content/game/lua-options";

export type GameVersion = {
    gameVersion: string;
    packageMd5: string;
    luaOptionSections: LuaOptionSection[];
    ais: GameAI[];
};

export interface GameAI {
    name: string;
    shortName: string;
    description: string;
    options?: LuaOptionSection[];
}
