// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { DeepReadonly } from "vue";
import type { BattleEndedEventData } from "tachyon-protocol/types";

// Read out of the readonly battle history store, so taken as readonly throughout.
export type BattleResultsData = DeepReadonly<BattleEndedEventData>;

export type BattleResultsPlayer = BattleResultsData["players"][number];
export type BattleResultsBot = BattleResultsData["bots"][number];
export type BattleResultsSpectator = BattleResultsData["spectators"][number];

// The event carries no time of its own, so receivedAt is when this client heard about it.
export type BattleHistoryEntry = {
    readonly id: string;
    readonly receivedAt: number;
    readonly data: BattleResultsData;
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
