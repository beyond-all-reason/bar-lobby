// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { LobbyOverview, UserId } from "tachyon-protocol/types";

// Fields the list filters can use once Tachyon sends them. Until then they are always absent,
// and every filter that reads one lets a lobby without it through.
export type LobbyListEntry = LobbyOverview &
    Partial<{
        memberIds: UserId[];
        allyTeamCount: number;
        passworded: boolean;
        tags: string[];
        bossMode: boolean;
    }>;

// "stale" lobbies stopped matching the filters after the list was last ordered, and "removed"
// ones have closed. Both keep their place until the next refresh so the list doesn't jump.
export type LobbyListRow = { id: string; state: "live" | "stale"; lobby: LobbyListEntry } | { id: string; state: "removed" };

export type LobbyMatchContext = {
    friendIds: ReadonlySet<UserId>;
    partyMemberIds: ReadonlySet<UserId>;
    devMode: boolean;
};
