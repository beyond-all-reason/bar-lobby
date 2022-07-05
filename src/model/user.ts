import { BattleContenderConfig } from "@/model/battle/types";

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

export type BattleStatus = BattleContenderConfig & {
    away: boolean;
    inBattle: boolean;
    battleId: number;
    isSpectator: boolean;
    ready: boolean;
    sync: {
        engine: boolean;
        game: boolean;
        map: boolean;
    };
};
