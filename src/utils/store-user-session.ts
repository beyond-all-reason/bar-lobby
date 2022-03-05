import type { ServerCommandType } from "tachyon-client";

type UserData = NonNullable<ServerCommandType<"s.auth.verify">["user"] & ServerCommandType<"s.auth.login">["user"]>;

export function storeUserSession(user?: UserData) {
    if (!user) {
        console.warn("User data is null");
        return;
    }

    window.api.session.model.user = {
        id: user.id,
        springId: user.springid,
        name: user.name,
        bot: user.bot,
        clanId: user.clan_id,
        friendIds: user.friends,
        friendRequestIds: user.friend_requests,
    };
}