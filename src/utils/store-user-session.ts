import { ServerCommandType } from "tachyon-client";
import { ref } from "vue";

type UserData = NonNullable<ServerCommandType<"s.auth.verify">["user"] & ServerCommandType<"s.auth.login">["user"]>;

export function storeUserSession(user?: UserData) {
    if (!user) {
        console.warn("User data is null");
        return;
    }

    window.api.session.account = ref({
        id: user.id,
        springid: user.springid,
        name: user.name,
        bot: user.bot,
        clan_id: user.clan_id,
        friends: user.friends,
        friend_requests: user.friend_requests,
    });
}