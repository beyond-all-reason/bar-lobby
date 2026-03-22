// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { LobbyCreateOkResponse, LobbyVoteEndedEventData, VoteActions } from "tachyon-protocol/types";

export type Lobby = LobbyCreateOkResponse["data"] & {
    maxPlayerCount: number;
    playerCount: number;
    spectatorCount: number;
    playerQueue: Map<number, string>;
    botCount: number;
    voteHistory: Map<string, VoteEntry>;
};

export type VoteEntry = VoteActions & { outcome: LobbyVoteEndedEventData["outcome"] | "pending" };
