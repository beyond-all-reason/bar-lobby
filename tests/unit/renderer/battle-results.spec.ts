// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";
import type { BattleEndedEventData } from "tachyon-protocol/types";
import { allyTeamDisplayNumber, battleResultTitleKey, buildBattleResultsView, pickLayout, summarizeBattle } from "@renderer/components/battle/results/battleResults.utils";

vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));

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
    it("lists ally teams in id order, with only my team expanded", () => {
        const view = buildBattleResultsView(
            battle({
                players: [player("a", "0"), player("b", "1"), player(ME, "2"), player("c", "3")],
                winningAllyTeamIds: ["3"],
            }),
            ME
        );

        expect(view.allyTeams.map((team) => team.id)).toEqual(["0", "1", "2", "3"]);
        expect(view.allyTeams.map((team) => team.defaultCollapsed)).toEqual([true, true, false, true]);
        expect(view.iWon).toBe(false);
        expect(view.myAllyTeamId).toBe("2");
    });

    it("keeps bots apart from the players on their ally team", () => {
        const view = buildBattleResultsView(battle({ players: [player("b", "0", "2"), player("a", "0", "1")], bots: [bot("RaptorsAI", "0", "0", "0")], winningAllyTeamIds: ["0"] }), ME);

        const [team] = view.allyTeams;
        expect(team.players.map((p) => p.userId)).toEqual(["a", "b"]);
        expect(team.bots.map((b) => b.shortName)).toEqual(["RaptorsAI"]);
    });

    it("orders bots by team and slot", () => {
        const view = buildBattleResultsView(battle({ bots: [bot("c", "0", "2", "0"), bot("b", "0", "1", "1"), bot("a", "0", "1", "0")] }), ME);

        expect(view.allyTeams[0].bots.map((b) => b.shortName)).toEqual(["a", "b", "c"]);
    });

    it("counts a team made only of bots", () => {
        const view = buildBattleResultsView(battle({ players: [player(ME, "0")], bots: [bot("BARb", "1")], winningAllyTeamIds: ["1"] }), ME);

        expect(view.allyTeams.map((team) => team.id)).toEqual(["0", "1"]);
        expect(view.allyTeams[1].players).toEqual([]);
    });

    it("treats every listed ally team as a winner", () => {
        const view = buildBattleResultsView(battle({ players: [player("a", "0"), player("b", "1"), player("c", "2")], winningAllyTeamIds: ["2", "0"] }), ME);

        expect(view.allyTeams.filter((team) => team.isWinner).map((team) => team.id)).toEqual(["0", "2"]);    });

    it("calls it a draw when nobody won", () => {
        const view = buildBattleResultsView(battle({ players: [player(ME, "0"), player("a", "1")] }), ME);

        expect(view.isDraw).toBe(true);
        expect(view.iWon).toBe(false);
    });

    it("has no team of mine when I only watched", () => {
        const view = buildBattleResultsView(battle({ players: [player("a", "0"), player("b", "1"), player("c", "2")], spectators: [{ userId: ME, name: ME }], winningAllyTeamIds: ["0"] }), ME);

        expect(view.myAllyTeamId).toBeUndefined();
        expect(view.allyTeams.map((team) => team.defaultCollapsed)).toEqual([true, true, true]);
        expect(view.spectators).toHaveLength(1);
    });

    it("sorts ally teams numerically rather than as text", () => {
        const players = Array.from({ length: 11 }, (_, i) => player(`p${i}`, String(i)));
        const view = buildBattleResultsView(battle({ players, winningAllyTeamIds: ["5"] }), ME);

        expect(view.allyTeams.map((team) => team.id)).toEqual(["0", "1", "2", "3", "4", "5", "6","7", "8", "9", "10"]);
    });
});

describe("pickLayout", () => {
    const teams = (count: number) => battle({ players: Array.from({ length: count }, (_, i) => player(`p${i}`, String(i))) });

    it.each([
        [1, "list"],
        [2, "twoColumn"],
        [3, "threeColumn"],
        [4, "list"],
        [5, "list"],
    ])("uses the %i team layout %s", (count, layout) => {
        expect(pickLayout(buildBattleResultsView(teams(count), ME))).toBe(layout);
    });
});

describe("battleResultTitleKey", () => {
    it("is victory when my team won", () => {
        const view = buildBattleResultsView(battle({ players: [player(ME, "0"), player("a", "1")], winningAllyTeamIds: ["0"] }), ME);

        expect(battleResultTitleKey(view)).toBe("lobby.components.battle.battleResults.victory");
    });

    it("is defeat when another team won", () => {
        const view = buildBattleResultsView(battle({ players: [player(ME, "0"), player("a", "1")], winningAllyTeamIds: ["1"] }), ME);

        expect(battleResultTitleKey(view)).toBe("lobby.components.battle.battleResults.defeat");
    });

    it("is a draw when nobody won", () => {
        const view = buildBattleResultsView(battle({ players: [player(ME, "0"), player("a", "1")] }), ME);

        expect(battleResultTitleKey(view)).toBe("lobby.components.battle.battleResults.draw");
    });

    it("is battle ended when I only watched", () => {
        const view = buildBattleResultsView(battle({ players: [player("a", "0"), player("b", "1")], spectators: [{ userId: ME, name: ME }], winningAllyTeamIds: ["0"] }), ME);

        expect(battleResultTitleKey(view)).toBe("lobby.components.battle.battleResults.battleEnded");
    });
});

describe("summarizeBattle", () => {
    it("joins the ally team sizes", () => {
        const summary = summarizeBattle(battle({ players: [player("a", "0"), player("b", "0"), player("c", "1"), player("d", "1")] }));

        expect(summary).toEqual({ teamSizes: "2v2", bots: 0 });
    });

    it("counts bots in their team's size and separately", () => {
        const summary = summarizeBattle(battle({ players: [player("a", "0")], bots: [bot("BARb", "1"), bot("BARb", "1")] }));

        expect(summary).toEqual({ teamSizes: "1v2", bots: 2 });
    });
});

describe("allyTeamDisplayNumber", () => {
    it("counts numeric ids from one", () => {
        expect(allyTeamDisplayNumber("0")).toBe("1");
    });

    it("leaves other ids alone", () => {
        expect(allyTeamDisplayNumber("red")).toBe("red");
    });
});
