// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";
import { Faction, type Bot } from "@main/game/battle/battle-types";

vi.mock("@renderer/store/engine.store", () => ({
    enginesStore: reactive({ selectedEngineVersion: undefined }),
}));

vi.mock("@renderer/store/game.store", () => ({
    gameStore: reactive({ selectedGameVersion: undefined }),
    startBattle: vi.fn(),
}));

vi.mock("@renderer/store/maps.store", () => ({
    getRandomMap: vi.fn(),
}));

vi.mock("@renderer/store/me.store", () => ({
    me: reactive({
        userId: "1",
        username: "Player",
        battleRoomState: {},
    }),
}));

vi.mock("@renderer/api/notifications", () => ({
    notificationsApi: { alert: vi.fn() },
}));

import { battleActions, battleStore } from "@renderer/store/battle.store";

const bot: Bot = {
    id: 1,
    host: 2,
    name: "BARbarIAn",
    aiShortName: "BARb",
    faction: Faction.Armada,
    aiOptions: {},
};

describe("battle bot updates", () => {
    beforeEach(() => {
        battleStore.teams = [];
    });

    it("updates the current bot inside a team", () => {
        const currentBot = { ...bot, aiOptions: {} };
        battleStore.teams = [{ participants: [currentBot] }];

        expect(battleActions.updateBotFaction(bot, Faction.Cortex)).toBe(true);
        expect(battleActions.updateBotOptions(bot, { profile: "easy" })).toBe(true);
        expect(currentBot.faction).toBe(Faction.Cortex);
        expect(currentBot.aiOptions).toEqual({ profile: "easy" });
    });

    it("ignores an update emitted after the bot was removed", () => {
        expect(battleActions.updateBotFaction(bot, Faction.Cortex)).toBe(false);
        expect(battleActions.updateBotOptions(bot, { profile: "easy" })).toBe(false);
    });
});
