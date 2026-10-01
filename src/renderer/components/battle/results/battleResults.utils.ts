// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { AllyTeamView, BattleResultsData, BattleResultsLayout, BattleResultsView } from "@renderer/model/battleResults";
import type { TranslationKey } from "@renderer/i18n";

function compareIds(a: string, b: string) {
    return a.localeCompare(b, undefined, { numeric: true });
}

// Engine ally teams are zero based.
export function allyTeamDisplayNumber(id: string): string {
    return /^\d+$/.test(id) ? String(Number(id) + 1) : id;
}

export function buildBattleResultsView(data: BattleResultsData, myUserId: string): BattleResultsView {
    const winners = new Set(data.winningAllyTeamIds);
    const myAllyTeamId = data.players.find((player) => player.userId === myUserId)?.allyTeam;

    const teams = new Map<string, AllyTeamView>();
    const teamFor = (id: string) => {
        let team = teams.get(id);
        if (!team) {
            const isWinner = winners.has(id);
            const containsMe = id === myAllyTeamId;
            team = { id, isWinner, containsMe, defaultCollapsed: !isWinner && !containsMe, players: [], bots: [] };
            teams.set(id, team);
        }
        return team;
    };

    for (const player of data.players) teamFor(player.allyTeam).players.push(player);
    for (const bot of data.bots) teamFor(bot.allyTeam).bots.push(bot);

    const bySlot = (a: { team: string; player: string }, b: { team: string; player: string }) => compareIds(a.team, b.team) || compareIds(a.player, b.player);
    const rank = (team: AllyTeamView) => (team.isWinner ? 0 : team.containsMe ? 1 : 2);

    const allyTeams = [...teams.values()].sort((a, b) => rank(a) - rank(b) || compareIds(a.id, b.id));
    for (const team of allyTeams) {
        team.players.sort(bySlot);
        team.bots.sort(bySlot);
    }

    return {
        allyTeams,
        spectators: [...data.spectators],
        myAllyTeamId,
        iWon: myAllyTeamId !== undefined && winners.has(myAllyTeamId),
        isDraw: winners.size === 0,
    };
}

export function pickLayout(view: BattleResultsView): BattleResultsLayout {
    if (view.allyTeams.length === 2) return "twoColumn";
    if (view.allyTeams.length === 3) return "threeColumn";
    return "list";
}

export function battleResultTitleKey(view: BattleResultsView): TranslationKey {
    if (view.iWon) return "lobby.components.battle.battleResults.victory";
    if (view.isDraw) return "lobby.components.battle.battleResults.draw";
    if (view.myAllyTeamId !== undefined) return "lobby.components.battle.battleResults.defeat";
    return "lobby.components.battle.battleResults.battleEnded";
}

// Ally team sizes joined as "2v2" or "1v1v1", bots included.
export function summarizeBattle(data: BattleResultsData): { teamSizes: string; bots: number } {
    const teamSizes = new Map<string, number>();
    for (const participant of [...data.players, ...data.bots]) {
        teamSizes.set(participant.allyTeam, (teamSizes.get(participant.allyTeam) ?? 0) + 1);
    }
    return { teamSizes: [...teamSizes.values()].join("v"), bots: data.bots.length };
}
