// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export type lobbyPlayer = {
    userId: string;
    name: string;
    allyTeam?: string; //Unsure if this should be optional for spectators, or if they are assigned a specific team ID or something.
    team?: string;
    playerNumber?: string; //This is the number used in the startscript. Probably not relevant to us but we will hold it for now.
    rank?: number;
    countryCode?: string;
    playerType: "self" | "friend" | "player" | "AI" | "spectator";
    roles?: ("contributor" | "admin" | "moderator" | "tournament_winner" | "tournament_caster")[];
    //We can use this to show/group players that are in a party, but it is not a guarantee that the entire party is in the same lobby.
    //There could also be more than one party in the lobby, which we will need to separate visually somehow.
    partyId?: string;
};
