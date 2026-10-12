// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { LobbyOverview, UserId } from "tachyon-protocol/types";

// Not sent by Tachyon yet; filters let lobbies without them through.
export type LobbyListEntry = LobbyOverview &
    Partial<{
        memberIds: UserId[];
        allyTeamCount: number;
        passworded: boolean;
        tags: string[];
        bossMode: boolean;
    }>;

// stale: stopped matching since the list was ordered. removed: closed. Both hold their place until refresh.
export type LobbyListRow = { id: string; state: "live" | "stale"; lobby: LobbyListEntry } | { id: string; state: "removed" };

export type LobbyMatchContext = {
    friendIds: ReadonlySet<UserId>;
    partyMemberIds: ReadonlySet<UserId>;
    // Includes the user.
    partySize: number;
    devMode: boolean;
};
