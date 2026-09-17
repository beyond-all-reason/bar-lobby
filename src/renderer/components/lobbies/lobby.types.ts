// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// This is not defined in the protocol as type/interface, but it's consistent for type "player" so we are just going to define it ourselves.
import type { UserId } from "tachyon-protocol/types";

export interface Member {
    id: UserId;
    allyTeam: string;
    team: string;
    player: string;
}
export interface LobbyBot {
    id: string;
    hostUserId: string;
    allyTeam: string;
    team: string;
    player: string;
    name?: string;
    shortName?: string;
    version?: string | null;
    options?: {
        [k: string]: string;
    };
}
