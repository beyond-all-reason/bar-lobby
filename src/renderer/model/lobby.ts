// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { UnixTime, StartBox, UserId } from "tachyon-protocol/types";

export type Lobby = {
    id: string;
    name: string;
    mapName: string;
    engineVersion: string;
    gameVersion: string;
    playerCount: number;
    maxPlayerCount: number;
    spectatorCount: number;
    playerQueue: Map<number, string>;
    allyTeams: {
        [k: string]: {
            startBox: StartBox;
            maxTeams: number;
            teams: {
                [k: string]: {
                    maxPlayers: number;
                };
            };
        };
    };
    players: {
        [k: string]: {
            id: UserId;
            allyTeam: string;
            team: string;
            player: string;
        };
    };
    spectators: {
        [k: string]: {
            id: UserId;
            joinQueuePosition?: number;
        };
    };
    currentBattle?: {
        startedAt: UnixTime;
    };
};
