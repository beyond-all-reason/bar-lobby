// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ref, type Ref } from "vue";
import type { BattleEndedEventData } from "tachyon-protocol/types";
import { Signal } from "$/jaz-ts-utils/signal";
import type { AllyTeamView, BattleHistoryEntry, BattleResultsLayout, BattleResultsView } from "@renderer/model/battleResults";

const isOpen = ref(false);
const entry = ref<BattleHistoryEntry | null>(null);
const reveal = ref(false);

// Raised when the results open straight off a battle/ended event rather than being reopened from
// history, for anything that wants to accompany the reveal animation.
export const onBattleResultsReveal = new Signal<BattleHistoryEntry>();

export function useBattleResults() {
    return {
        isOpen: isOpen as Ref<boolean>,
        entry: entry as Ref<BattleHistoryEntry | null>,
        reveal: reveal as Ref<boolean>,
        show(historyEntry: BattleHistoryEntry, options: { reveal?: boolean } = {}) {
            entry.value = historyEntry;
            reveal.value = options.reveal ?? false;
            isOpen.value = true;
        },
        close() {
            isOpen.value = false;
            reveal.value = false;
        },
    };
}

function compareIds(a: string, b: string) {
    return a.localeCompare(b, undefined, { numeric: true });
}

// Ally team ids are zero based as the engine counts them, which reads oddly as a label.
export function allyTeamDisplayNumber(id: string): string {
    return /^\d+$/.test(id) ? String(Number(id) + 1) : id;
}

export function buildBattleResultsView(data: BattleEndedEventData, myUserId: string): BattleResultsView {
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
