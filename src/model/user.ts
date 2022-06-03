export type User = {
    userId: number;
    username: string;
    icons: Record<string, string>;
    isBot: boolean;
    clanId: number | null;
    countryCode: string;
    legacyId: number | null;
    battleStatus: BattleStatus;
};

export type CurrentUser = User & {
    permissions: string[];
    friendUserIds: number[];
    friendRequestUserIds: number[];
    ignoreUserIds: number[];
};

export type BattleStatus = {
    inBattle: boolean;
    battleId: number;
    away: boolean;
    spectator: boolean;
    ready: boolean;
    color: string;
    teamId: number;
    playerId: number;
};
