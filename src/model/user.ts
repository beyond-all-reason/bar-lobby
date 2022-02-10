export type User = {
    id: number;
    legacyId: number;
    displayName: string;
    isBot: boolean;
    clanId: number;
    friendIds: number[];
    friendRequestIds: number[];
};