// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/**
 * Clan base data model and the expanded version.
 */

export type ClanBaseData = {
    clanId: string;
    tag: string;
    name: string;
};
export type ClanData = {
    ClanBaseData: ClanBaseData;
    description?: string;
    clanMembers: string[];
};
