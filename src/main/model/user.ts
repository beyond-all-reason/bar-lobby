export type User = {
    userId: number;
    username: string;
    icons: Record<string, string>;
    clanId: number | null;
    countryCode: string;
    isOnline: boolean;
    status?: "busy" | "away" | "online" | "offline" | "in-lobby" | "playing" | "spectating";
    gameId?: string;

    // When user is a contender in a battle
    battleRoomState: {
        isSpectator?: boolean;
        isReady?: boolean;
        teamId?: number;
    };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isUser(user: any): user is User {
    return "username" in user;
}

export type CurrentUser = User & {
    permissions: Set<string>;
    friendUserIds: Set<number>;
    outgoingFriendRequestUserIds: Set<number>;
    incomingFriendRequestUserIds: Set<number>;
    ignoreUserIds: Set<number>;
};
