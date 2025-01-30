export type User = {
    userId: string;
    username: string;
    displayName: string;
    clanId: string | null;
    partyId: string | null;
    // scopes: string[];
    countryCode: string;
    status: "offline" | "menu" | "playing" | "lobby";

    // Is the user me?
    isMe?: 0 | 1;

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

export type Me = User & {
    permissions: Set<string>;
    friendUserIds: Set<number>;
    outgoingFriendRequestUserIds: Set<number>;
    incomingFriendRequestUserIds: Set<number>;
    ignoreUserIds: Set<number>;
};
