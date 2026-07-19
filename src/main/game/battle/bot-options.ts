// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { LuaOptionList } from "@main/content/game/lua-options";

import { Faction } from "./battle-types";

export const botFactionOptions = [
    { name: Faction.Armada, value: Faction.Armada },
    { name: Faction.Cortex, value: Faction.Cortex },
];

export const barbProfileOptions: LuaOptionList["options"] = [
    { key: "hard_aggressive", name: "Hard | Aggressive", type: "list" },
    { key: "hard", name: "Hard | Balanced", type: "list" },
    { key: "medium", name: "Medium | Lazy", type: "list" },
    { key: "easy", name: "Easy | Slow", type: "list" },
    { key: "dev", name: "Testing AI", type: "list" },
];
