// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { BattleEndedEventData } from "tachyon-protocol/types";

export type BattleResultsPlayer = BattleEndedEventData["players"][number];
export type BattleResultsBot = BattleEndedEventData["bots"][number];
export type BattleResultsSpectator = BattleEndedEventData["spectators"][number];

// The event carries no time of its own, so receivedAt is when this client heard about it.
export type BattleHistoryEntry = {
    id: string;
    receivedAt: number;
    data: BattleEndedEventData;
};

export type AllyTeamView = {
    id: string;
    isWinner: boolean;
    containsMe: boolean;
    defaultCollapsed: boolean;
    players: BattleResultsPlayer[];
    bots: BattleResultsBot[];
};

export type BattleResultsView = {
    allyTeams: AllyTeamView[];
    spectators: BattleResultsSpectator[];
    myAllyTeamId?: string;
    iWon: boolean;
    isDraw: boolean;
};

export type BattleResultsLayout = "twoColumn" | "threeColumn" | "list";
