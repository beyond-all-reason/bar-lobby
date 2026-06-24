// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { BattleWithMetadata, Faction, GameModeID, StartPosType } from "@main/game/battle/battle-types";
import { startScriptConverter } from "@main/utils/start-script-converter";

function makeUser(userId: string, username: string) {
    return {
        userId,
        username,
        displayName: username,
        clanId: null,
        partyId: null,
        countryCode: "US",
        status: "menu" as const,
        battleRoomState: {},
    };
}

function makeBattle(factions: Array<Faction | undefined>, modoptions: Record<string, unknown> = {}): BattleWithMetadata {
    const players = factions.map((faction, id) => ({
        id,
        name: `Player ${id}`,
        user: makeUser(String(id + 1), `Player${id}`),
        contentSyncState: {
            engine: 0,
            game: 0,
            map: 0,
        },
        inGame: false,
        faction,
    }));

    return {
        title: "Startscript test",
        isOnline: false,
        battleOptions: {
            engineVersion: "2025.06.21",
            gameVersion: "Beyond All Reason test",
            gameMode: {
                id: GameModeID.CLASSIC,
                label: "Classic",
                options: modoptions,
            },
            map: {
                springName: "Test Map",
            } as never,
            mapOptions: {
                startPosType: StartPosType.Fixed,
            },
            restrictions: [],
        },
        me: players[0],
        teams: players.map((player) => ({ participants: [player] })),
        spectators: [],
        participants: players,
        bots: [],
        players,
        started: false,
    };
}

function makeSkirmishAiBattle(): BattleWithMetadata {
    const player = {
        id: 0,
        name: "Player",
        user: makeUser("1", "Player"),
        contentSyncState: {
            engine: 0,
            game: 0,
            map: 0,
        },
        inGame: false,
        faction: Faction.Armada,
    };
    const bot = {
        id: 1,
        host: 0,
        aiShortName: "BARb",
        name: "BARbarIAn",
        aiOptions: {},
    };

    return {
        title: "Skirmish AI test",
        isOnline: false,
        battleOptions: {
            engineVersion: "2025.06.21",
            gameVersion: "Beyond All Reason test",
            gameMode: {
                id: GameModeID.CLASSIC,
                label: "Classic",
                options: {},
            },
            map: {
                springName: "Test Map",
            } as never,
            mapOptions: {
                startPosType: StartPosType.Fixed,
            },
            restrictions: [],
        },
        me: player,
        teams: [{ participants: [player] }, { participants: [bot] }],
        spectators: [],
        participants: [player, bot],
        bots: [bot],
        players: [player],
        started: false,
    };
}

describe("start script converter", () => {
    it("writes Legion as the BAR side name and enables the Legion content modoption", () => {
        const script = startScriptConverter.generateScriptStr(makeBattle([Faction.Legion], { fixedallies: 1 }));

        expect(script).toMatch(/\[team0\] \{[\s\S]*side=Legion;/);
        expect(script).toMatch(/\[modoptions\] \{[\s\S]*fixedallies=1;/);
        expect(script).toMatch(/\[modoptions\] \{[\s\S]*experimentallegionfaction=1;/);
    });

    it("writes BAR side names without enabling Legion content unless Legion is selected", () => {
        const script = startScriptConverter.generateScriptStr(makeBattle([Faction.Armada, Faction.Cortex, Faction.Random]));

        expect(script).toMatch(/\[team0\] \{[\s\S]*side=Armada;/);
        expect(script).toMatch(/\[team1\] \{[\s\S]*side=Cortex;/);
        expect(script).toMatch(/\[team2\] \{[\s\S]*side=Random;/);
        expect(script).not.toContain("experimentallegionfaction");
    });

    it("enables the BAR Legion option when a player uses the in-game faction picker", () => {
        const script = startScriptConverter.generateScriptStr(makeBattle([undefined]));
        const playerTeam = script.match(/\[team0\] \{([\s\S]*?)\n\s*\}/)?.[1];

        expect(playerTeam).toBeDefined();
        expect(playerTeam).not.toContain("side=");
        expect(script).toMatch(/\[modoptions\] \{[\s\S]*experimentallegionfaction=1;/);
    });

    it("respects an explicit disabled Legion option when faction choice is deferred", () => {
        const script = startScriptConverter.generateScriptStr(makeBattle([undefined], { experimentallegionfaction: false }));

        expect(script).toMatch(/\[modoptions\] \{[\s\S]*experimentallegionfaction=0;/);
    });

    it("does not assign a hidden default faction to skirmish AI", () => {
        const script = startScriptConverter.generateScriptStr(makeSkirmishAiBattle());
        const aiTeam = script.match(/\[team1\] \{([\s\S]*?)\n\s*\}/)?.[1];

        expect(script).toMatch(/startpostype=0;/);
        expect(script).toMatch(/\[ai1\] \{[\s\S]*shortname=BARb;/);
        expect(aiTeam).toBeDefined();
        expect(aiTeam).not.toContain("side=");
        expect(script).not.toContain("experimentallegionfaction");
    });
});
