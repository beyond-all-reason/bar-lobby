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
    playerQueue: UserId[];
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
    members: {
        [k: string]:
            | {
                  type: "player";
                  id: UserId;
                  allyTeam: string;
                  team: string;
                  player: string;
              }
            | {
                  type: "spec";
                  id: UserId;
                  joinQueuePosition?: number;
              };
    };
    currentBattle?: {
        startedAt: UnixTime;
    };
};
