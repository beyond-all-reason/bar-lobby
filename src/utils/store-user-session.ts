import type { ResponseType } from "tachyon-client";

type UserData = NonNullable<ResponseType<"s.auth.verify">["user"] & ResponseType<"s.auth.login">["user"]>;

export function storeUserSession(user?: UserData) {
    if (!user) {
        console.warn("User data is null");
        return;
    }

    api.session.setCurrentUser({
        userId: user.id,
        legacyId: Number(user.springid),
        username: user.name,
        isBot: user.bot,
        clanId: user.clan_id ?? undefined,
        friendUserIds: user.friends,
        friendRequestUserIds: user.friend_requests,
        // TODO
        icons: {},
        skill: {},
        ignoreUserIds: [],
        permissions:[],
        status: {isAway: false, isInGame: false}
    });
}