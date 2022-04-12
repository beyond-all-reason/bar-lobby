
export interface User {
    userId: number;
    username: string;
    skill: Record<string, number>;
    icons: Record<string, string>;
    isBot: boolean;
    status: { isInGame: boolean; isAway: boolean; };
    legacyId?: number;
    clanId?: number;
}

export interface CurrentUser extends User {
    permissions: string[];
    friendUserIds: number[];
    friendRequestUserIds: number[];
    ignoreUserIds: number[];
}