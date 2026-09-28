// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { BattleEndedEventData } from "tachyon-protocol/types";

vi.mock("@renderer/store/db", () => ({
    db: { users: { where: () => ({ first: async () => undefined, modify: async () => undefined }), put: vi.fn() } },
}));
vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));

Object.assign(window.tachyon, { disconnect: vi.fn(async () => {}), onConnected: vi.fn() });
Object.defineProperty(window, "auth", {
    value: {
        logout: vi.fn(async () => {}),
        getState: vi.fn(async () => ({ authenticated: false })),
        getIdentity: vi.fn(async () => undefined),
        hasCredentials: vi.fn(async () => false),
        login: vi.fn(async () => {}),
        onChanged: vi.fn(),
    },
    writable: true,
});

const { buildBattleResultsView, pickLayout, useBattleResults, allyTeamDisplayNumber } = await import("@renderer/composables/useBattleResults");
const { battleHistory, initMeStore } = await import("@renderer/store/me.store");

const ME = "me";

function player(userId: string, allyTeam: string, team = "0", slot = "0") {
    return { userId, name: userId, allyTeam, team, player: slot };
}

function bot(shortName: string, allyTeam: string, team = "9", slot = "9") {
    return { shortName, allyTeam, team, player: slot };
}

function battle(overrides: Partial<BattleEndedEventData> = {}): BattleEndedEventData {
    return { battleId: "battle-1", players: [], bots: [], spectators: [], winningAllyTeamIds: [], ...overrides };
}

describe("buildBattleResultsView", () => {
    it("lists the winners first, then my team expanded, with the rest collapsed", () => {
        const view = buildBattleResultsView(
            battle({
                players: [player("a", "0"), player("b", "1"), player(ME, "2"), player("c", "3")],
                winningAllyTeamIds: ["3"],
            }),
            ME
        );

        expect(view.allyTeams.map((team) => team.id)).toEqual(["3", "2", "0", "1"]);
        expect(view.allyTeams.map((team) => team.defaultCollapsed)).toEqual([false, false, true, true]);
        expect(view.iWon).toBe(false);
        expect(view.myAllyTeamId).toBe("2");
    });

    it("does not pull my team up a second time when it won", () => {
        const view = buildBattleResultsView(battle({ players: [player("a", "0"), player(ME, "1"), player("b", "2")], winningAllyTeamIds: ["1"] }), ME);

        expect(view.allyTeams.map((team) => team.id)).toEqual(["1", "0", "2"]);
        expect(view.iWon).toBe(true);
    });

    it("keeps bots apart from and after the players on their ally team", () => {
        const view = buildBattleResultsView(battle({ players: [player("b", "0", "2"), player("a", "0", "1")], bots: [bot("RaptorsAI", "0", "0", "0")], winningAllyTeamIds: ["0"] }), ME);

        const [team] = view.allyTeams;
        expect(team.players.map((p) => p.userId)).toEqual(["a", "b"]);
        expect(team.bots.map((b) => b.shortName)).toEqual(["RaptorsAI"]);
    });

    it("counts a team made only of bots", () => {
        const view = buildBattleResultsView(battle({ players: [player(ME, "0")], bots: [bot("BARb", "1")], winningAllyTeamIds: ["1"] }), ME);

        expect(view.allyTeams.map((team) => team.id)).toEqual(["1", "0"]);
        expect(view.allyTeams[0].players).toEqual([]);
    });

    it("treats every listed ally team as a winner", () => {
        const view = buildBattleResultsView(battle({ players: [player("a", "0"), player("b", "1"), player("c", "2")], winningAllyTeamIds: ["2", "0"] }), ME);

        expect(view.allyTeams.filter((team) => team.isWinner).map((team) => team.id)).toEqual(["0", "2"]);
        expect(view.allyTeams[2].id).toBe("1");
    });

    it("calls it a draw when nobody won", () => {
        const view = buildBattleResultsView(battle({ players: [player(ME, "0"), player("a", "1")] }), ME);

        expect(view.isDraw).toBe(true);
        expect(view.iWon).toBe(false);
    });

    it("has no team of mine when I only watched", () => {
        const view = buildBattleResultsView(battle({ players: [player("a", "0"), player("b", "1"), player("c", "2")], spectators: [{ userId: ME, name: ME }], winningAllyTeamIds: ["0"] }), ME);

        expect(view.myAllyTeamId).toBeUndefined();
        expect(view.allyTeams.map((team) => team.defaultCollapsed)).toEqual([false, true, true]);
        expect(view.spectators).toHaveLength(1);
    });

    it("sorts ally teams numerically rather than as text", () => {
        const players = Array.from({ length: 11 }, (_, i) => player(`p${i}`, String(i)));
        const view = buildBattleResultsView(battle({ players, winningAllyTeamIds: ["5"] }), ME);

        expect(view.allyTeams.map((team) => team.id)).toEqual(["5", "0", "1", "2", "3", "4", "6", "7", "8", "9", "10"]);
    });
});

describe("pickLayout", () => {
    const teams = (count: number) => battle({ players: Array.from({ length: count }, (_, i) => player(`p${i}`, String(i))) });

    it.each([
        [1, "list"],
        [2, "twoColumn"],
        [3, "threeColumn"],
        [5, "list"],
    ])("uses the %i team layout %s", (count, layout) => {
        expect(pickLayout(buildBattleResultsView(teams(count), ME))).toBe(layout);
    });
});

describe("allyTeamDisplayNumber", () => {
    it("counts from one", () => {
        expect(allyTeamDisplayNumber("0")).toBe("1");
        expect(allyTeamDisplayNumber("red")).toBe("red");
    });
});

describe("battle history", () => {
    let onBattleEnded: (data: BattleEndedEventData) => void;

    beforeAll(async () => {
        await initMeStore();
        const call = vi.mocked(window.tachyon.onEvent).mock.calls.find(([command]) => command === "battle/ended");
        onBattleEnded = call![1] as (data: BattleEndedEventData) => void;
    });

    beforeEach(() => {
        battleHistory.splice(0);
        useBattleResults().close();
    });

    it("records each ended battle in order and reveals the results", () => {
        onBattleEnded(battle({ battleId: "first" }));
        onBattleEnded(battle({ battleId: "second" }));

        expect(battleHistory.map((entry) => entry.id)).toEqual(["first", "second"]);
        const { isOpen, entry, reveal } = useBattleResults();
        expect(isOpen.value).toBe(true);
        expect(entry.value?.id).toBe("second");
        expect(reveal.value).toBe(true);
    });

    it("ignores the same battle ending twice", () => {
        onBattleEnded(battle({ battleId: "first" }));
        onBattleEnded(battle({ battleId: "first" }));

        expect(battleHistory).toHaveLength(1);
    });

    it("reopens from history without the reveal", () => {
        onBattleEnded(battle({ battleId: "first" }));
        const results = useBattleResults();
        results.close();

        results.show(battleHistory[0]);

        expect(results.isOpen.value).toBe(true);
        expect(results.reveal.value).toBe(false);
    });
});
