// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { LobbyOverview, UserId } from "tachyon-protocol/types";

export type LobbyListEntry = LobbyOverview &
    Partial<{
        memberIds: UserId[];
        allyTeamCount: number;
        passworded: boolean;
        tags: string[];
        bossMode: boolean;
    }>;

export type LobbyListRow = { id: string; state: "live" | "stale"; lobby: LobbyListEntry } | { id: string; state: "removed" };

export type LobbyMatchContext = {
    friendIds: ReadonlySet<UserId>;
    partyMemberIds: ReadonlySet<UserId>;
    partySize: number;
    devMode: boolean;
};
