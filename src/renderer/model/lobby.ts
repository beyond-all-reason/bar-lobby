// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { UnixTime } from "tachyon-protocol/types";
import { Startbox } from "@main/content/maps/map-metadata";
import { lobbyPlayer } from "@renderer/model/lobbyPlayer";

export type Lobby = {
    id: string;
    name: string;
    mapName: string;
    engineVersion: string;
    gameVersion: string;
    allyTeams?: {
        [k: string]: {
            startBox?: Startbox;
            maxTeams?: number;
            teams: {
                [k: string]: {
                    maxPlayers?: number;
                } | null;
            } | null;
        };
    };
    members?: {
        [k: string]: lobbyPlayer | null;
    };
    currentBattle?: {
        id: string;
        startedAt: UnixTime;
    } | null;
};
