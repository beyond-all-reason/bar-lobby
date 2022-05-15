import { Static } from "@sinclair/typebox";
import type { myUserSchema } from "tachyon-client";

export function storeUserSession(user?: Static<typeof myUserSchema>) {
    if (!user) {
        console.warn("User data is null");
        return;
    }

    api.session.setCurrentUser({
        userId: user.id,
        legacyId: Number(user.springid),
        username: user.name,
        isBot: user.bot,
        clanId: user.clan_id,
        friendUserIds: user.friends,
        friendRequestUserIds: user.friend_requests,
        icons: user.icons, // TODO,
        ignoreUserIds: [],
        permissions:[],
        countryCode: "TODO", // TODO
    });
}