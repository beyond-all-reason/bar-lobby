// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { UnixTime, StartBox, UserId } from "tachyon-protocol/types";
//import { Startbox } from "@main/content/maps/map-metadata";
//import { lobbyPlayer } from "@renderer/model/lobbyPlayer";

// With changes this is now just the same as the tachyon type for LobbyJoinOkResponseData | LobbyCreateOkResponseData
export type Lobby = {
    id: string;
    name: string;
    mapName: string;
    engineVersion: string;
    gameVersion: string;
    playerCount: number;
    maxPlayerCount: number;
    allyTeams?: {
        [k: string]: {
            startBox?: StartBox;
            maxTeams?: number;
            teams: {
                [k: string]: {
                    maxPlayers?: number;
                } | null;
            } | null;
        };
    };
    members?: {
        [k: string]: {
            type: "player";
            id: UserId;
            allyTeam: string;
            team: string;
            player: string;
        } | null;
    };
    currentBattle?: {
        startedAt: UnixTime;
    } | null;
};
